import {
    overlayButtonToCommitItemsForPricing, pushNextItemToPrice,
    stageItemForPricing,
} from "@src/pricingQueue";
import { assume } from "@src/util/typeAssertions";
import { $, $All } from "@src/util/domHelpers";
import { db, Listing } from "@src/database/listings";
import { getJsonSetting } from "@src/util/localStorage";

function stockedItemFromRow(row: HTMLElement) {
    const priceInput =
        row.querySelector<HTMLInputElement>('input[type="text"]');

    if (!priceInput) {
        return null;
    }

    return {
        name: row.innerText.split("\t")[0],
        price: parseInt(priceInput.value),
    };
}

function daysAgo(epochMillis: number) {
    return Math.round((Date.now() - epochMillis) / (1000 * 60 * 60 * 24));
}

function underCut(marketPrice: number) {
    return Math.max(marketPrice - (marketPrice % 100) - 1, 1);
}

function getMarketPrice(listings: Listing[]) {
    return getMarketPriceEntry(listings).price;
}

function getMarketPriceEntry(listings: Listing[]): Listing {
    if (lowestPriceIsSelf(listings)) {
        return listings[1];
    }

    return listings[0];
}

function getCurrentUser(): string | null {
    const topRightCorner = $(".user");
    if (topRightCorner) {
        return topRightCorner.innerText.split("|")[0].split(" ")[1];
    }
    return null;
}

function lowestPriceIsSelf(listings: Listing[]) {
    return listings[0].userName === getCurrentUser();
}

const maxPriceStalenessInDays = getJsonSetting("maxPriceStalenessInDays", 1);

async function adjustPriceOfStockItem(row: HTMLElement) {
    const item = stockedItemFromRow(row);
    if (!item) {
        return;
    }

    const listings = await db.getListings(item.name);

    if (listings.length === 0) {
        pushNextItemToPrice(item.name);
        console.log(`${item.name} is not priced yet, submitting...`);
        return;
    }

    const marketPriceEntry = getMarketPriceEntry(listings);
    if (daysAgo(marketPriceEntry.lastSeen) > maxPriceStalenessInDays.get()) {
        if (getMarketPrice(listings) > 500) {
            stageItemForPricing(item.name);
            console.log(
                `${item.name} is ${daysAgo(
                    marketPriceEntry.lastSeen,
                )} days stale, submitting...`,
            );
        } else {
            console.log(
                `${item.name} is already cheap, not worth checking the price again`,
            );
        }
    }

    const priceInput = assume(
        row.querySelector<HTMLInputElement>('input[type="text"]'),
    );

    const underCutPrice = underCut(getMarketPrice(listings));
    const currentPrice = parseInt(priceInput.value);

    if (lowestPriceIsSelf(listings)) {
        console.log(`The cheapest price for ${item.name} is us already`);
        assume(priceInput.parentNode).append(" " + currentPrice.toString());
        return;
    }
    if (currentPrice !== 0 && currentPrice <= underCutPrice) {
        console.log(`${item.name} already beats market price`);
        return;
    }

    // Show the original price before discounting
    console.log(`${item.name}: undercutting ${marketPriceEntry.link}`);
    assume(priceInput.parentNode).append(" " + currentPrice.toString());
    priceInput.value = underCutPrice.toString();
}

async function priceStockItems() {
    await Promise.all(
        $All('form[action="process_market.phtml"] tr').map(
            adjustPriceOfStockItem,
        ),
    );
}

priceStockItems().then(overlayButtonToCommitItemsForPricing);
