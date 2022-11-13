import { getListings, getMarketPrice } from "@src/database/listings";
import {
    ensureNpcShopScript,
    getNpcShopStock,
    getNpcStockTab,
    HaggleSession,
} from "@src/contentScriptActions/getNpcShopStock";
import { hoursAgo } from "@src/util/dateTime";
import { HaggleDetails } from "@src/contentScripts/haggle";
import { getNpcStockPrice } from "@src/database/npcStock";
import { assume } from "@src/util/typeAssertions";
import { l, ljs } from "@src/util/logging";
import { normalDelay } from "@src/util/randomDelay";
import { getCurrentShopStock, recordPurchase } from "@src/database/myShopStock";
import browser from "webextension-polyfill";
import { waitForTabStatus } from "@src/util/tabControl";

type BuyOpportunity = {
    itemName: string;
    hoursStale: number;
    quantity: number;
    marketPrice: number;
    profit: number;
    profitRatio: number;
    hagglePrice: number;
    haggleProfit: number;
    haggleProfitRatio: number;
    alreadyStocked: number;
    futureHaggleProfit: number;
    futureHaggleProfitRatio: number;
};

function underTimeNTimes(price: number, timesToUndercut: number) {
    let underCutPrice = price;
    for (let i = 0; i < timesToUndercut; i += 1) {
        underCutPrice = Math.min(underCutPrice * 0.95, underCutPrice - 100);
    }
    return underCutPrice;
}

async function estimateProfitability(
    tabId: number,
    shopId: number,
): Promise<BuyOpportunity[]> {
    const npcStock = await getNpcShopStock(tabId, shopId);
    return Promise.all(
        npcStock.map(async ({ itemName, price, quantity }) => {
            const listings = await getListings(itemName);

            const marketPrice =
                listings.length > 1 ? listings[0].price : 100_000;

            const hagglePrice = price * 0.75;
            const haggleProfit = marketPrice - hagglePrice;
            const haggleProfitRatio = haggleProfit / hagglePrice;

            const profit = marketPrice - price;
            const profitRatio = profit / price;

            const alreadyStocked = await getCurrentShopStock(itemName);
            // Penalize buying lots of the same item, cause the price will
            // change by time it's next up to be sold.
            const futureMarketPrice = underTimeNTimes(
                marketPrice,
                alreadyStocked,
            );
            const futureHaggleProfit = futureMarketPrice - hagglePrice;
            const futureHaggleProfitRatio = futureHaggleProfit / hagglePrice;

            return {
                itemName,
                hoursStale: listings[0] ? hoursAgo(listings[0].lastSeen) : 0,
                quantity,
                marketPrice,
                profit,
                profitRatio,
                hagglePrice,
                haggleProfit,
                haggleProfitRatio,
                alreadyStocked,
                futureHaggleProfit,
                futureHaggleProfitRatio,
            };
        }),
    );
}

function isWorth({
    futureHaggleProfit,
    futureHaggleProfitRatio,
}: BuyOpportunity) {
    return futureHaggleProfit > 2000 && futureHaggleProfitRatio > 0.5;
}

async function bestItemToHaggleFor(
    tabId: number,
    shopId: number,
): Promise<BuyOpportunity | undefined> {
    const buyOpportunities = await estimateProfitability(tabId, shopId);
    return ljs(
        buyOpportunities
            .filter(isWorth)
            .sort((buyA, buyB) => buyB.haggleProfit - buyA.haggleProfit),
    )[0];
}

function makeHumanTypable(amount: number) {
    const tail = amount % 1000;
    const head = amount - tail;
    const repeatedTail = 111 * Math.floor(tail / 111);
    return head + repeatedTail;
}

const CLOSE_ENOUGH = 100;

export async function getNextOffer({
    itemName,
    lastOffer,
    currentAsk,
}: HaggleDetails): Promise<number> {
    const stockPrice = await getNpcStockPrice(itemName);

    const profit = (await getMarketPrice(itemName)) - stockPrice;
    const profitRatio = profit / stockPrice;
    const probablyHighlyContested = profit > 10000 && profitRatio > 0.5;
    if (probablyHighlyContested) {
        return makeHumanTypable(currentAsk);
    }

    const bestPrice = Math.round(stockPrice * 0.75);
    const haggleRoom = currentAsk - lastOffer;
    // We've already haggled down to the best possible price
    if (currentAsk <= bestPrice) {
        return bestPrice;
    }
    // We got unlucky with discounts, there's no more room left to haggle
    if (haggleRoom <= CLOSE_ENOUGH) {
        // Settle for whatever price we currently have
        return currentAsk;
    }

    const nextOffer = Math.min(
        makeHumanTypable(lastOffer + haggleRoom / 3),
        bestPrice,
    );

    // With small prices, the rounding might put us back at the same amount
    if (nextOffer <= currentAsk) {
        return makeHumanTypable(nextOffer + 150);
    }
    return nextOffer;
}

export type BuyOutcome =
    | {
          status: "NOTHING_TO_BUY";
      }
    | {
          status: "OUT_OF_MONEY";
      }
    | {
          status: "SOLD_OUT";
      }
    | {
          status: "STUCK_IN_LOOP";
          offer: number;
          currentAsk: number;
      }
    | {
          status: "OFFER_ACCEPTED";
          itemName: string;
          price: number;
      };

const MAX_HAGGLES = 10;
export async function buyBestItemIfAny(
    shopId: number,
    timeToSelectItem = 555,
): Promise<BuyOutcome> {
    const { tab, justRefreshed } = await getNpcStockTab(shopId);
    const tabId = assume(tab.id);

    if (!justRefreshed) {
        await browser.tabs.reload(tabId, {
            bypassCache: true,
        });
        await waitForTabStatus(tabId, "complete");
    }

    await ensureNpcShopScript(tab);

    const buyOpportunity = await bestItemToHaggleFor(tabId, shopId);

    if (!buyOpportunity) {
        return { status: "NOTHING_TO_BUY" };
    }

    await normalDelay(timeToSelectItem);

    const session = await HaggleSession.start(tabId, buyOpportunity.itemName);

    let nextOffer = 0;
    let situation = null;
    for (
        let haggleAttempt = 0;
        haggleAttempt < MAX_HAGGLES;
        haggleAttempt += 1
    ) {
        situation = await session.getSituation();
        if (situation.status === "OUT_OF_MONEY") {
            return { status: "OUT_OF_MONEY" };
        }
        if (situation.status === "SOLD_OUT") {
            await normalDelay(1111);
            return { status: "SOLD_OUT" };
        }
        if (situation.status === "OFFER_ACCEPTED") {
            await recordPurchase(buyOpportunity.itemName);
            await normalDelay(5555);
            return {
                status: "OFFER_ACCEPTED",
                itemName: buyOpportunity.itemName,
                price: nextOffer,
            };
        }

        nextOffer = await getNextOffer(situation);
        await session.makeOffer(nextOffer);
    }

    await normalDelay(1111);

    return {
        status: "STUCK_IN_LOOP",
        offer: nextOffer,
        currentAsk: assume(situation).currentAsk,
    };
}
