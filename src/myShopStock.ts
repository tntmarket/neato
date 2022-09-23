import {
    getItemDB,
    getMarketPrice,
    getMarketPriceEntry,
    lowestPriceIsSelf,
} from "@src/itemDatabase";
import { pushNextItemToPrice } from "@src/pricingQueue";
import { assume } from "@src/util/typeAssertions";
import { $All } from "@src/util/domHelpers";

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

function priceStockItems(priceFreshnessInDays = 7) {
    const itemDB = getItemDB();

    $All('form[action="process_market.phtml"] tr').forEach((row) => {
        const item = stockedItemFromRow(row);
        if (!item) {
            return;
        }

        const itemEntry = itemDB[item.name];

        if (!itemEntry) {
            pushNextItemToPrice(item.name);
            console.log(`${item.name} is not priced yet, submitting...`);
            return;
        }

        if (daysAgo(itemEntry.lastUpdated) > priceFreshnessInDays) {
            if (getMarketPrice(itemEntry) > 500) {
                pushNextItemToPrice(item.name);
                console.log(
                    `${item.name} is ${daysAgo(
                        itemEntry.lastUpdated,
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

        const underCutPrice = underCut(getMarketPrice(itemEntry));
        const currentPrice = parseInt(priceInput.value);

        if (lowestPriceIsSelf(itemEntry)) {
            console.log(`The cheapest price for ${item.name} is us already`);
            assume(priceInput.parentNode).append(" " + currentPrice.toString());
            return;
        }
        if (currentPrice !== 0 && currentPrice <= underCutPrice) {
            console.log(`${item.name} already beats market price`);
            return;
        }

        // Show the original price before discounting
        console.log(
            `${item.name}: undercutting ${getMarketPriceEntry(itemEntry).link}`,
        );
        assume(priceInput.parentNode).append(" " + currentPrice.toString());
        priceInput.value = underCutPrice.toString();
    });
}

priceStockItems();
