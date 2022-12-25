import { assume } from "@src/util/typeAssertions";
import { $, $All } from "@src/util/domHelpers";
import { NpcStockData } from "@src/database/npcStock";
import { normalDelay } from "@src/util/randomDelay";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener } from "@src/util/scriptInjection";
import {
    MIN_PROFIT_TO_BUY,
    MIN_PROFIT_RATIO,
    MIN_PROFIT_RATIO_TO_QUICK_BUY,
    MIN_PROFIT_TO_QUICK_BUY,
} from "@src/autoRestock/autoRestockConfig";
import { calculateBuyOpportunity } from "@src/autoRestock/buyingItems";
import { getJsonSetting } from "@src/util/localStorage";

const blackMarketItems = getJsonSetting<string[]>("blackMarketItems", []);

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
            let itemImage = item.querySelector<HTMLElement>(".item-img");
            if (!itemImage) {
                // Black Market Goods boon
                itemImage = assume(
                    item.querySelector<HTMLElement>(".item-obelisk"),
                );
                blackMarketItems.set(blackMarketItems.get().concat([itemName]));
            }
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
    const npcStockData = shopItemToStockData(item);

    const {
        alreadyStocked,
        fellBackToJellyNeo,
        daysToImpactfulPriceChange,
        hagglePrice,
        marketPrice,
        futureHaggleProfit,
        futureHaggleProfitRatio,
    } = await callProcedure(calculateBuyOpportunity, npcStockData);

    const stockLine = item.querySelectorAll<HTMLElement>(".item-stock")[0];
    if (alreadyStocked > 0) {
        stockLine.innerText = `${npcStockData.quantity} in stock | ${alreadyStocked}`;
        stockLine.style.color = "darkred";
    }

    const extraInfo = getInfoContainer(item);
    item.style.backgroundColor = "";
    item.style.opacity = "";

    extraInfo.title = `${Math.round(daysToImpactfulPriceChange * 100) / 100}`;
    if (fellBackToJellyNeo) {
        extraInfo.style.background = "greenyellow";
    } else if (daysToImpactfulPriceChange < 0) {
        extraInfo.style.background = `rgba(0,0,0,${Math.min(
            // 7 days stale -> blacked out
            -daysToImpactfulPriceChange / 7,
            1,
        )})`;
    } else {
        extraInfo.style.background = "none";
    }

    const haggleLabel = document.createElement("p");
    haggleLabel.className = "item-stock";
    haggleLabel.style.color = futureHaggleProfit > 0 ? "darkgreen" : "darkred";
    haggleLabel.append(
        `${Math.round(futureHaggleProfit)} / ${Math.round(
            futureHaggleProfitRatio * 100,
        )}%`,
    );
    extraInfo.append(haggleLabel);

    const haggleBuySellLabel = document.createElement("p");
    haggleBuySellLabel.className = "item-stock";
    haggleBuySellLabel.append(`${Math.round(hagglePrice)} → `);
    const marketPriceLink = document.createElement("a");
    marketPriceLink.append(marketPrice.toString());
    marketPriceLink.href = "javascript:void(0)";
    haggleBuySellLabel.append(marketPriceLink);
    extraInfo.append(haggleBuySellLabel);

    if (
        futureHaggleProfit > MIN_PROFIT_TO_QUICK_BUY &&
        futureHaggleProfitRatio > MIN_PROFIT_RATIO_TO_QUICK_BUY
    ) {
        item.style.backgroundColor = "lightcoral";
    } else if (
        futureHaggleProfit > MIN_PROFIT_TO_BUY &&
        futureHaggleProfitRatio > MIN_PROFIT_RATIO
    ) {
        item.style.backgroundColor = "lightblue";
    } else if (futureHaggleProfit < 1000 || futureHaggleProfitRatio < 0.2) {
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
