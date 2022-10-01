import {
    overlayButtonToCommitItemsForPricing,
    pushNextItemToPrice,
    stageItemForPricing,
} from "@src/pricingQueue";
import { assume } from "@src/util/typeAssertions";
import { $, $All } from "@src/util/domHelpers";
import { getListings, Listing } from "@src/database/listings";
import { getJsonSetting } from "@src/util/localStorage";
import { daysAgo } from "@src/util/dateTime";
import { openLink } from "@src/util/navigationHelpers";

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

    const listings = await getListings(item.name);

    if (listings.length === 0) {
        pushNextItemToPrice(item.name);
        console.log(`${item.name} is not priced yet, submitting...`);
        return;
    }

    const marketPriceEntry = getMarketPriceEntryExcludingSelf(listings);
    if (daysAgo(marketPriceEntry.lastSeen) > maxPriceStalenessInDays.get()) {
        if (getMarketPriceExcludingSelf(listings) > 500) {
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

    const marketPrice = getMarketPriceExcludingSelf(listings);
    const underCutPrice = underCut(marketPrice);
    const currentPrice = parseInt(priceInput.value);

    if (currentPrice > 0 && currentPrice <= underCutPrice) {
        console.log(`${item.name} already beats market price ${marketPrice}`);
        return;
    }

    // Show the original price before discounting
    console.log(`${item.name}: undercutting ${marketPriceEntry.link}`);
    const marketPriceLabel = document.createElement("a");
    marketPriceLabel.onclick = () => {
        openLink(marketPriceEntry.link);
    };
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
