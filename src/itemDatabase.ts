import { $ } from "@src/util/domHelpers";

type ItemDatabase = {
    [itemName: string]: ItemEntry;
};
type ItemEntry = {
    lastUpdated: number; // milliseconds
    topPrices: PriceEntry[];
};
export type PriceEntry = {
    link: string;
    price: number;
    quantity: number;
    username: string;
};

export function setItemDB(itemDB: ItemDatabase) {
    return localStorage.setItem(
        "davelu.shopWizardPriceDatabase",
        JSON.stringify(itemDB),
    );
}

export function getItemDB(): ItemDatabase {
    return JSON.parse(
        localStorage.getItem("davelu.shopWizardPriceDatabase") || "{}",
    );
}

function getCurrentUser(): string | null {
    const topRightCorner = $(".user");
    if (topRightCorner) {
        return topRightCorner.innerText.split("|")[0].split(" ")[1];
    }
    return null;
}

export function getMarketPrice(itemEntry: ItemEntry) {
    return getMarketPriceEntry(itemEntry).price;
}

export function getMarketPriceEntry(itemEntry: ItemEntry): PriceEntry {
    if (lowestPriceIsSelf(itemEntry)) {
        return itemEntry.topPrices[1];
    }

    return itemEntry.topPrices[0];
}

export function lowestPriceIsSelf(itemEntry: ItemEntry) {
    return itemEntry.topPrices[0].username === getCurrentUser();
}
