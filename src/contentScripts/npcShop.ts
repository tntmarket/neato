import { assume } from "@src/util/typeAssertions";
import { $, $All } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { openLink } from "@src/util/navigationHelpers";
import { NpcStockData } from "@src/database/npcStock";
import { normalDelay } from "@src/util/randomDelay";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener } from "@src/util/scriptInjection";
import { estimateDaysToImpactfulPriceChange } from "@src/priceMonitoring";
import {
    ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW,
    MIN_PROFIT,
    MIN_PROFIT_RATIO,
    MIN_PROFIT_RATIO_TO_QUICK_BUY,
    MIN_PROFIT_TO_QUICK_BUY,
} from "@src/autoRestock/autoRestockConfig";
import { getJellyNeoEntry } from "@src/database/jellyNeo";

ensureListener(
    (
        request:
            | { action: "GET_NPC_STOCK" }
            | { action: "HAGGLE_FOR_ITEM"; itemName: string },
    ) => {
        if (request.action === "GET_NPC_STOCK") {
            return scrapeNpcStock();
        }
        if (request.action === "HAGGLE_FOR_ITEM") {
            return startHaggling(request.itemName);
        }
    },
);

function shopItemToStockData(item: HTMLElement): NpcStockData {
    return {
        itemName: assume(item.querySelector<HTMLElement>(".item-name"))
            .innerText,
        price: parseInt(
            item
                .querySelectorAll<HTMLInputElement>(".item-stock")[1]
                .innerText.split("Cost: ")[1]
                .replaceAll(",", ""),
        ),
        quantity: parseInt(
            assume(item.querySelectorAll<HTMLElement>(".item-stock")[0])
                .innerText,
        ),
    };
}

async function scrapeNpcStock(): Promise<NpcStockData[]> {
    return $All(".shop-item").map(shopItemToStockData);
}

async function startHaggling(itemToHaggleFor: string) {
    for (const item of $All(".shop-item")) {
        const { itemName } = shopItemToStockData(item);
        if (itemName === itemToHaggleFor) {
            const itemImage = assume(
                item.querySelector<HTMLElement>(".item-img"),
            );
            itemImage.click();
            // Time to click "YES" in the modal
            await normalDelay(222);
            assume($("#confirm-link")).click();
            return;
        }
    }
    throw new Error(`Couldn't find ${itemToHaggleFor}`);
}

function getInfoContainer(item: HTMLElement): HTMLElement {
    let container = item.querySelector<HTMLElement>(".neato-info");
    if (container) {
        container.innerHTML = "";
        return container;
    }

    container = document.createElement("div");
    container.className = "neato-info";
    item.append(container);
    return container;
}

async function annotateShopItem(item: HTMLElement) {
    const { itemName: name, price } = shopItemToStockData(item);

    const listings = await callProcedure(getListings, name);
    const jellyNeoEntry = await callProcedure(getJellyNeoEntry, name);
    // Pretend item is worth 10000 if jelly neo doesn't know the price
    const jellyNeoPrice =
        jellyNeoEntry?.price || ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW;

    const extraInfo = getInfoContainer(item);
    item.style.backgroundColor = "";
    item.style.opacity = "";

    const listing = listings[0];

    const daysToImpactfulPriceChange =
        estimateDaysToImpactfulPriceChange(listings);
    if (!listing) {
        extraInfo.style.background = "greenyellow";
    } else if (daysToImpactfulPriceChange < 0) {
        extraInfo.style.background = `rgba(0,0,0,${Math.min(
            // 7 days stale -> blacked out
            -daysToImpactfulPriceChange / 7,
            1,
        )})`;
    }

    const marketPrice = listing ? listing.price : jellyNeoPrice;

    const hagglePrice = price * 0.75;
    const haggleProfit = marketPrice - hagglePrice;
    const haggleProfitRatio = haggleProfit / hagglePrice;

    const profit = marketPrice - price;
    const profitRatio = profit / price;

    // const profitLabel = document.createElement("p");
    // profitLabel.className = "item-stock";
    // profitLabel.style.color = profit > 0 ? "darkgreen" : "darkred";
    // profitLabel.append(`${profit} / ${Math.round(profitRatio * 100)}%`);
    // extraInfo.append(profitLabel);

    const haggleLabel = document.createElement("p");
    haggleLabel.className = "item-stock";
    haggleLabel.style.color = haggleProfit > 0 ? "darkgreen" : "darkred";
    haggleLabel.append(
        `${Math.round(haggleProfit)} / ${Math.round(haggleProfitRatio * 100)}%`,
    );
    extraInfo.append(haggleLabel);

    const haggleBuySellLabel = document.createElement("p");
    haggleBuySellLabel.className = "item-stock";
    haggleBuySellLabel.append(`${Math.round(price * 0.75)} → `);
    const marketPriceLink = document.createElement("a");
    marketPriceLink.append(marketPrice.toString());
    marketPriceLink.href = "javascript:void(0)";
    marketPriceLink.onclick = () => {
        openLink(listings[0].link);
    };
    haggleBuySellLabel.append(marketPriceLink);
    extraInfo.append(haggleBuySellLabel);

    if (
        profit > MIN_PROFIT_TO_QUICK_BUY &&
        profitRatio > MIN_PROFIT_RATIO_TO_QUICK_BUY
    ) {
        item.style.backgroundColor = "lightcoral";
    } else if (
        haggleProfit > MIN_PROFIT &&
        haggleProfitRatio > MIN_PROFIT_RATIO
    ) {
        item.style.backgroundColor = "lightblue";
    } else if (haggleProfit < 1000 || haggleProfitRatio < 0.2) {
        item.style.opacity = "0.2";
    }
}

async function annotateShopStock() {
    try {
        await Promise.all($All(".shop-item").map(annotateShopItem));
    } catch (e) {
        console.error(e);
        clearInterval(keepUpdatingItemInfo);
    }
}

annotateShopStock();
const keepUpdatingItemInfo = setInterval(annotateShopStock, 3000);
// overlayButtonToCommitItemsForPricing();
