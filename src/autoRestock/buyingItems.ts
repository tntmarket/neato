import { getListings, getMarketPrice } from "@src/database/listings";
import {
    getNpcShopStock,
    getNpcStockTab,
    HaggleSession,
} from "@src/contentScriptActions/getNpcShopStock";
import { HaggleDetails } from "@src/contentScripts/haggle";
import { getNpcStockPrice, NpcStockData } from "@src/database/npcStock";
import { assume } from "@src/util/typeAssertions";
import { ljs } from "@src/util/logging";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { getCurrentShopStock, incrementStock } from "@src/database/myShopStock";
import browser from "webextension-polyfill";
import { waitForTabStatus } from "@src/util/tabControl";
import { estimateDaysToImpactfulPriceChange } from "@src/priceMonitoring";
import {
    ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW,
    MAX_COPIES_TO_SHELVE,
    MIN_PROFIT,
    MIN_PROFIT_RATIO,
    MIN_PROFIT_RATIO_TO_QUICK_BUY,
    MIN_PROFIT_TO_QUICK_BUY,
} from "@src/autoRestock/autoRestockConfig";
import { getJellyNeoEntry } from "@src/database/jellyNeo";
import { recordPurchase } from "@src/database/purchaseLog";

type BuyOpportunity = {
    itemName: string;
    daysToImpactfulPriceChange: number;
    quantity: number;
    marketPrice: number;
    profit: number;
    profitRatio: number;
    hagglePrice: number;
    alreadyStocked: number;
    futureHaggleProfit: number;
    futureHaggleProfitRatio: number;
    fellBackToJellyNeo: boolean;
    jellyNeoPrice: number;
};

export function underCut(marketPrice: number) {
    if (marketPrice > 100000) {
        // 637000 -> 629999
        return Math.max(marketPrice - (marketPrice % 10000) - 1, 1);
    }
    if (marketPrice > 10000) {
        // 37500 -> 36999
        return Math.max(marketPrice - (marketPrice % 1000) - 1, 1);
    }
    // 5750 -> 5699
    return Math.max(marketPrice - (marketPrice % 100) - 1, 1);
}

function undercutNTimes(price: number, timesToUndercut: number) {
    let underCutPrice = price;
    for (let i = 0; i < timesToUndercut; i += 1) {
        underCutPrice = underCut(underCutPrice);
    }
    return underCutPrice;
}

export async function calculateBuyOpportunity({
    itemName,
    price,
    quantity,
}: NpcStockData): Promise<BuyOpportunity> {
    const listings = await getListings(itemName);
    const listing = listings[0];

    // Fall back to jelly neo if we don't know the price
    const jellyNeoEntry = await getJellyNeoEntry(itemName);
    // Pretend item is worth 10000 if jelly neo doesn't know the price
    const jellyNeoPrice =
        jellyNeoEntry?.price || ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW;

    // Fall back to jelly neo if we don't know the price
    const marketPrice = listing ? listing.price : jellyNeoPrice;

    const hagglePrice = price * 0.75;

    const profit = marketPrice - price;
    const profitRatio = profit / price;

    const alreadyStocked = await getCurrentShopStock(itemName);
    // Penalize buying lots of the same item, cause the price will
    // change by time it's next up to be sold.
    const futureMarketPrice = undercutNTimes(marketPrice, alreadyStocked + 1);
    const futureHaggleProfit = futureMarketPrice - hagglePrice;
    const futureHaggleProfitRatio = futureHaggleProfit / hagglePrice;

    return {
        itemName,
        daysToImpactfulPriceChange:
            estimateDaysToImpactfulPriceChange(listings),
        quantity,
        marketPrice,
        profit,
        profitRatio,
        hagglePrice,
        alreadyStocked,
        futureHaggleProfit,
        futureHaggleProfitRatio,
        fellBackToJellyNeo: !listing,
        jellyNeoPrice,
    };
}

async function estimateProfitability(
    tabId: number,
    shopId: number,
): Promise<BuyOpportunity[]> {
    const npcStock = await getNpcShopStock(tabId, shopId);
    return Promise.all(npcStock.map(calculateBuyOpportunity));
}

function isWorth({
    daysToImpactfulPriceChange,
    futureHaggleProfit,
    futureHaggleProfitRatio,
    alreadyStocked,
    fellBackToJellyNeo,
}: BuyOpportunity) {
    const isMinimallyProfitable =
        futureHaggleProfit > MIN_PROFIT &&
        futureHaggleProfitRatio > MIN_PROFIT_RATIO;
    if (!isMinimallyProfitable) {
        return false;
    }

    if (fellBackToJellyNeo) {
        // Don't over-commit to buying multiples. We'll have a better price after pricing the first copy anyways
        return alreadyStocked < 1;
    }

    if (daysToImpactfulPriceChange < 0) {
        // If the price is "too stale", don't trust the price until it's refreshed
        return false;
    }

    const isVeryProfitable =
        futureHaggleProfit > MIN_PROFIT_TO_QUICK_BUY &&
        futureHaggleProfitRatio > MIN_PROFIT_RATIO_TO_QUICK_BUY;
    if (isVeryProfitable) {
        // Buy up to 10 copies of very valuable items
        return alreadyStocked < 10;
    }

    // Buy up to 5 copies of marginally profitable items
    return alreadyStocked < MAX_COPIES_TO_SHELVE;
}

async function bestItemToHaggleFor(
    tabId: number,
    shopId: number,
): Promise<BuyOpportunity | undefined> {
    const buyOpportunities = await estimateProfitability(tabId, shopId);
    return ljs(
        buyOpportunities
            .filter(isWorth)
            .sort(
                (buyA, buyB) =>
                    buyB.futureHaggleProfit - buyA.futureHaggleProfit,
            ),
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
    const probablyHighlyContested =
        profit > MIN_PROFIT_TO_QUICK_BUY &&
        profitRatio > MIN_PROFIT_RATIO_TO_QUICK_BUY;
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
export async function buyBestItemIfAny(shopId: number): Promise<BuyOutcome> {
    const { tab, justRefreshed } = await getNpcStockTab(shopId);
    const tabId = assume(tab.id);

    if (!justRefreshed) {
        await browser.tabs.reload(tabId, {
            bypassCache: true,
        });
    }

    // Ensure script injected
    await waitForTabStatus(tabId, "complete");
    await sleep(100);

    const buyOpportunity = await bestItemToHaggleFor(tabId, shopId);

    if (!buyOpportunity) {
        return { status: "NOTHING_TO_BUY" };
    }

    // Time to choose an item to buy and click it
    await normalDelay(1111);
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
            await incrementStock(buyOpportunity.itemName);
            await recordPurchase({
                itemName: buyOpportunity.itemName,
                price: nextOffer,
            });
            // Wait at least 5s before returning to shop, cause we can
            // only buy a max of 1 item every 5s
            await normalDelay(6666);
            return {
                status: "OFFER_ACCEPTED",
                itemName: buyOpportunity.itemName,
                price: nextOffer,
            };
        }

        nextOffer = await getNextOffer(situation);
        if (nextOffer === situation.lastOffer) {
            // Failsafe in case we get stuck, and the price isn't budging
            nextOffer = situation.currentAsk;
        }
        // Time to type in offer and click captcha
        await normalDelay(888);
        await session.makeOffer(nextOffer);
    }

    return {
        status: "STUCK_IN_LOOP",
        offer: nextOffer,
        currentAsk: assume(situation).currentAsk,
    };
}
