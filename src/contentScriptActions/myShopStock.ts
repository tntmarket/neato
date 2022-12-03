import { assume } from "@src/util/typeAssertions";
import browser from "webextension-polyfill";
import {
    addStockedItems,
    getAllStockedItems,
    ShopStockResults,
    StockedItem,
} from "@src/database/myShopStock";
import { getListings, Listing } from "@src/database/listings";
import { NameToPrice } from "@src/contentScripts/myShopStock";
import { normalDelay } from "@src/util/randomDelay";
import { waitForTabStatus } from "@src/util/tabControl";
import { underCut } from "@src/autoRestock/buyingItems";

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
    await waitForTabStatus(tabId, "complete");
}

const MIN_PAGE = 1;
const MAX_PAGE = 40;

async function setShopStockPrices(
    tabId: number,
    itemNameToPrice: NameToPrice,
): Promise<ShopStockResults> {
    return browser.tabs.sendMessage(tabId, {
        action: "SET_USER_SHOP_PRICES",
        itemNameToPrice,
    });
}

async function setMyShopStockPrices(
    tabId: number,
    itemNameToPrice: NameToPrice,
): Promise<StockedItem[]> {
    let stockedItems: StockedItem[] = [];

    for (let pageNumber = MIN_PAGE; pageNumber <= MAX_PAGE; pageNumber += 1) {
        await setPage(tabId, pageNumber);

        // time to read and update the shop page
        await normalDelay(555);

        const { stock, hasMore } = await setShopStockPrices(
            tabId,
            itemNameToPrice,
        );

        stockedItems = stockedItems.concat(stock);

        if (!hasMore) {
            break;
        }
    }

    return stockedItems;
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

    const marketPrice = getMarketPriceEntryExcludingSelf(listings).price;
    const underCutPrice = underCut(marketPrice);

    if (price > 0 && price <= underCutPrice) {
        // console.log(`${itemName} already beats market price ${marketPrice}`);
        return price;
    }

    return underCutPrice;
}

export async function undercutMarketPrices(): Promise<void> {
    const tabId = await getMyShopPageTab(0);

    const previouslyStockedItems = await getAllStockedItems();

    const priceUpdates: NameToPrice = {};
    for (const { itemName, price } of previouslyStockedItems) {
        const newPrice = await getUnderCutPrice(itemName, price);
        if (newPrice > 0 && newPrice < 1000) {
            console.log(`${itemName} is only worth ${newPrice}, removing`);
            priceUpdates[itemName] = -1;
        } else if (price > 0 && newPrice > price) {
            // Refuse to raise prices, because selling faster is more valuable
            // than raising the prices, and possibly not being the cheapest
            // on the market anymore
            console.log(
                `Refusing to raise price of ${itemName} from ${price} => ${newPrice}`,
            );
        } else if (newPrice !== price) {
            console.log(`Updating ${itemName} from ${price} => ${newPrice}`);
            priceUpdates[itemName] = newPrice;
        }
    }

    const newlyStockedItems = await setMyShopStockPrices(tabId, priceUpdates);
    // Prevent accidentally clobbering shop in case a side account opens the shop
    if (newlyStockedItems.length > 0) {
        await addStockedItems(newlyStockedItems);
    }
}
