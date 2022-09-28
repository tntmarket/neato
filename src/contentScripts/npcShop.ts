import {
    overlayButtonToCommitItemsForPricing,
    stageItemForPricing,
} from "@src/pricingQueue";
import { assume } from "@src/util/typeAssertions";
import { $All } from "@src/util/domHelpers";
import { db, NpcStockData } from "@src/database/listings";

function makeTypable(price: number) {
    return Math.round(price);
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
        // quantity: parseInt(
        //     assume(item.querySelectorAll<HTMLElement>(".item-stock")[0])
        //         .innerText,
        // ),
    };
}

async function annotateShopItem(item: HTMLElement) {
    const { itemName: name, price } = shopItemToStockData(item);

    const listings = await db.getListings(name);

    const extraInfo = getInfoContainer(item);
    item.style.backgroundColor = "";
    item.style.opacity = "";

    if (listings.length === 0) {
        item.style.opacity = "0.5";
        stageItemForPricing(name);
        return;
    }

    const marketPrice = listings[0].price;

    const hagglePrice = price * 0.75;
    const haggleProfit = marketPrice - hagglePrice;
    const haggleProfitRatio = haggleProfit / hagglePrice;

    const profit = marketPrice - price;
    const profitRatio = profit / price;

    const profitLabel = document.createElement("p");
    profitLabel.className = "item-stock";
    profitLabel.style.color = profit > 0 ? "darkgreen" : "darkred";
    profitLabel.append(`${profit} / ${Math.round(profitRatio * 100)}%`);
    extraInfo.append(profitLabel);

    const haggleLabel = document.createElement("p");
    haggleLabel.className = "item-stock";
    haggleLabel.style.color = haggleProfit > 0 ? "darkgreen" : "darkred";
    haggleLabel.append(
        `${Math.round(haggleProfit)} / ${Math.round(haggleProfitRatio * 100)}%`,
    );
    extraInfo.append(haggleLabel);

    const hagglePointsLabel = document.createElement("p");
    hagglePointsLabel.className = "item-stock";
    hagglePointsLabel.append(`
        ${makeTypable(price * 0.33)},
        ${makeTypable(price * 0.5)},
        ${makeTypable(price * 0.66)},
        ${makeTypable(price * 0.75)},
    `);
    extraInfo.append(hagglePointsLabel);

    if (profit > 10000 && profitRatio > 0.4) {
        item.style.backgroundColor = "lightcoral";
    } else if (haggleProfit > 2000 && haggleProfitRatio > 0.6) {
        item.style.backgroundColor = "lightblue";
    } else if (haggleProfit < 1000 || haggleProfitRatio < 0.2) {
        item.style.opacity = "0.1";
    }
}

async function addProfitInfo() {
    await Promise.all($All(".shop-item").map(annotateShopItem));
}

async function initiallyAnotateItems() {
    const npcStocks = $All(".shop-item").map(shopItemToStockData);
    const shopId = parseInt(
        assume(new URLSearchParams(location.search).get("obj_type")),
    );

    await Promise.all([db.addNpcStocks(shopId, npcStocks), addProfitInfo()]);
    overlayButtonToCommitItemsForPricing();
}

initiallyAnotateItems();
setInterval(addProfitInfo, 5000);
