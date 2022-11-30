import { assume } from "@src/util/typeAssertions";
import browser from "webextension-polyfill";
import {
    addStockedItems,
    ShopStockResults,
    StockedItem,
} from "@src/database/myShopStock";
import { getListings, Listing } from "@src/database/listings";
import { NameToPrice } from "@src/contentScripts/myShopStock";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { waitForTabStatus } from "@src/util/tabControl";

function myShopStockUrl(page: number): string {
    if (page === 1) {
        return `https://www.neopets.com/market.phtml?order_by=id&type=your`;
    }
    return `https://www.neopets.com/market.phtml?order_by=id&type=your&lim=${
        page * 30
    }`;
}

async function getMyShopPageTab(page: number): Promise<number> {
    const myShopTabs = await browser.tabs.query({
        url: "https://www.neopets.com/market.phtml*type=your*",
    });

    let tab = myShopTabs[0];
    if (!tab) {
        tab = await browser.tabs.create({ url: myShopStockUrl(page) });
    }

    return assume(tab.id);
}

async function setPage(tabId: number, page = 1) {
    await browser.tabs.update(tabId, {
        url: myShopStockUrl(page),
    });
    await normalDelay(555);
    await waitForTabStatus(tabId, "complete");
}

async function ensureScriptInjected() {
    await sleep(2000);
}

async function getShopStock(tabId: number): Promise<ShopStockResults> {
    await ensureScriptInjected();

    return browser.tabs.sendMessage(tabId, {
        action: "GET_USER_SHOP_STOCK",
    });
}

const MIN_PAGE = 1;
const MAX_PAGE = 13;

async function getMyShopStock(tabId: number): Promise<StockedItem[]> {
    let stockedItems: StockedItem[] = [];

    for (let pageNumber = MIN_PAGE; pageNumber <= MAX_PAGE; pageNumber += 1) {
        await setPage(tabId, pageNumber);

        const { stock, hasMore } = await getShopStock(tabId);

        stockedItems = stockedItems.concat(stock);

        if (!hasMore) {
            break;
        }
    }

    return stockedItems;
}

async function setShopStockPrices(
    tabId: number,
    itemNameToPrice: NameToPrice,
): Promise<{ hasMore: boolean }> {
    await ensureScriptInjected();

    return browser.tabs.sendMessage(tabId, {
        action: "SET_USER_SHOP_PRICES",
        itemNameToPrice,
    });
}

async function setMyShopStockPrices(
    tabId: number,
    itemNameToPrice: NameToPrice,
): Promise<void> {
    for (let pageNumber = MIN_PAGE; pageNumber <= MAX_PAGE; pageNumber += 1) {
        await setPage(tabId, pageNumber);
        const { hasMore } = await setShopStockPrices(tabId, itemNameToPrice);

        if (!hasMore) {
            return;
        }
    }
}

//////////////////////////////////////////////////////

function underCut(marketPrice: number) {
    return Math.max(marketPrice - (marketPrice % 100) - 1, 1);
}

function getMarketPriceExcludingSelf(listings: Listing[]) {
    return getMarketPriceEntryExcludingSelf(listings).price;
}

function getMarketPriceEntryExcludingSelf(listings: Listing[]): Listing {
    if (lowestPriceIsSelf(listings)) {
        return listings[1];
    }

    return listings[0];
}

function lowestPriceIsSelf(listings: Listing[]) {
    return listings[0].userName === "kraaab";
}

async function getUnderCutPrice(
    itemName: string,
    price: number,
): Promise<number> {
    const listings = await getListings(itemName);

    if (listings.length === 0) {
        console.log(`Don't know the price of ${itemName} yet`);
        return price;
    }

    const marketPrice = getMarketPriceExcludingSelf(listings);
    const underCutPrice = underCut(marketPrice);

    if (price > 0 && price <= underCutPrice) {
        // console.log(`${itemName} already beats market price ${marketPrice}`);
        return price;
    }

    return underCutPrice;
}

export async function undercutMarketPrices(): Promise<void> {
    const tabId = await getMyShopPageTab(0);

    const allStockedItems = await getMyShopStock(tabId);
    // Prevent accidentally clobbering shop in case a side account opens the shop
    if (allStockedItems.length > 0) {
        await addStockedItems(allStockedItems);
    }

    const itemNameToPrice: NameToPrice = {};
    for (const { itemName, price } of allStockedItems) {
        const newPrice = await getUnderCutPrice(itemName, price);
        if (newPrice !== price) {
            console.log(`Updating ${itemName} from ${price} => ${newPrice}`);
            itemNameToPrice[itemName] = newPrice;
        } else if (newPrice > 0 && newPrice < 1000) {
            console.log(`${itemName} is only worth ${price}, removing`);
            itemNameToPrice[itemName] = -1;
        }
    }

    if (Object.keys(itemNameToPrice).length > 0) {
        await setMyShopStockPrices(tabId, itemNameToPrice);
    }
}
