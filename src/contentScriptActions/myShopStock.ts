import { assume } from "@src/util/typeAssertions";
import browser from "webextension-polyfill";
import {
    addStockedItems,
    ShopStockResults,
    StockedItem,
} from "@src/database/myShopStock";
import { getListings, Listing } from "@src/database/listings";
import { NameToPrice } from "@src/contentScripts/myShopStock";
import { checkPrice } from "@src/autoRestock/priceChecking";
import { daysAgo } from "@src/util/dateTime";
import { normalDelay } from "@src/util/randomDelay";
import { ljs } from "@src/util/logging";
import { waitForTabStatusChange } from "@src/util/tabControl";

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
    await waitForTabStatusChange(tabId, "complete");
}

async function ensureScriptInjected(tabId: number) {
    await browser.scripting.executeScript({
        target: {
            tabId,
        },
        files: ["js/myShopStock.js"],
    });
}

async function getShopStock(tabId: number): Promise<ShopStockResults> {
    await ensureScriptInjected(tabId);

    return browser.tabs.sendMessage(tabId, {
        action: "GET_USER_SHOP_STOCK",
    });
}

const MAX_PAGES = 13;

async function getMyShopStock(tabId: number): Promise<StockedItem[]> {
    let stockedItems: StockedItem[] = [];

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
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
    await ensureScriptInjected(tabId);

    return browser.tabs.sendMessage(tabId, {
        action: "SET_USER_SHOP_PRICES",
        itemNameToPrice,
    });
}

async function setMyShopStockPrices(
    tabId: number,
    itemNameToPrice: NameToPrice,
): Promise<void> {
    for (let pageNumber = 1; pageNumber < MAX_PAGES; pageNumber += 1) {
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

const MAX_STALENESS_OF_SHOP_STOCK = 1;

async function getUnderCutPrice(
    itemName: string,
    price: number,
): Promise<{ newPrice: number; tooManySearches?: true }> {
    let listings = await getListings(itemName);

    if (
        listings.length === 0 ||
        daysAgo(listings[0].lastSeen) > MAX_STALENESS_OF_SHOP_STOCK
    ) {
        if (listings.length === 0) {
            console.log(`${itemName} is unpriced. Pricing now...`);
        } else {
            // console.log(
            //     `${itemName} is ${daysAgo(
            //         listings[0].lastSeen,
            //     )} days old. Pricing now...`,
            // );
        }

        const { tooManySearches } = await checkPrice(itemName);
        listings = await getListings(itemName);
        if (tooManySearches) {
            return { newPrice: price, tooManySearches };
        }
    }

    const marketPrice = getMarketPriceExcludingSelf(listings);
    const underCutPrice = underCut(marketPrice);

    if (price > 0 && price <= underCutPrice) {
        // console.log(`${itemName} already beats market price ${marketPrice}`);
        return { newPrice: price };
    }

    return { newPrice: underCutPrice };
}

export async function undercutMarketPrices(): Promise<void> {
    const tabId = await getMyShopPageTab(0);

    const allStockedItems = await getMyShopStock(tabId);
    addStockedItems(allStockedItems);

    const itemNameToPrice: NameToPrice = {};
    for (const { itemName, price } of allStockedItems) {
        const { newPrice, tooManySearches } = await getUnderCutPrice(
            itemName,
            price,
        );
        if (tooManySearches) {
            break;
        }
        if (newPrice !== price) {
            console.log(`Updating ${itemName} from ${price} => ${newPrice}`);
            itemNameToPrice[itemName] = newPrice;
        }
    }

    await setMyShopStockPrices(tabId, itemNameToPrice);
}
