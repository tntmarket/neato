import { getListings, Listing } from "@src/database/listings";
import { daysAgo } from "@src/util/dateTime";
import { ljs } from "@src/util/logging";
import { db } from "@src/database/databaseSchema";
import { getNpcStock } from "@src/database/npcStock";
import { getJellyNeoEntries } from "@src/database/jellyNeo";
import {
    getAllStockedItems,
    getCurrentShopStock,
} from "@src/database/myShopStock";

type RankingResult = {
    itemName: string;
    price1: number;
    price2: number;
    daysUntilStale: number;
};

export async function getNextItemsToReprice(limit = 20): Promise<string[]> {
    const allItemNames = new Set(
        await db.transaction("r", db.listings, () =>
            db.listings.orderBy("itemName").uniqueKeys(),
        ),
    );

    const myStockedItems = await getAllStockedItems();
    myStockedItems.forEach((stock) => allItemNames.add(stock.itemName));

    const npcStockItems = await getNpcStock();
    npcStockItems.forEach((stock) => allItemNames.add(stock.itemName));

    const neoJellyItems = await getJellyNeoEntries();
    neoJellyItems.forEach((stock) => allItemNames.add(stock.itemName));

    const rankingResults: RankingResult[] = [];

    await Promise.all(
        [...allItemNames].map(async (itemName) => {
            if (typeof itemName !== "string") {
                throw new Error(`${itemName.toString()} is not an item name`);
            }
            const listings = await getListings(itemName, 100);

            if (listings.length === 0) {
                rankingResults.push({
                    itemName,
                    price1: 0,
                    price2: 0,
                    daysUntilStale: 0,
                });
                return;
            }

            const estimatedDaysUntilPriceChange =
                estimateDaysToImpactfulPriceChange(listings);

            const currentShopStock = await getCurrentShopStock(itemName);
            if (currentShopStock) {
                rankingResults.push({
                    itemName,
                    price1: listings[0].price,
                    price2: listings[1]?.price,
                    // Always keep our shop inventory at least 3 days fresh
                    daysUntilStale: 1 - daysAgo(listings[0].lastSeen),
                });
                return;
            }

            rankingResults.push({
                itemName,
                price1: listings[0].price,
                price2: listings[1]?.price,
                daysUntilStale:
                    estimatedDaysUntilPriceChange -
                    daysAgo(listings[0].lastSeen),
            });
        }),
    );

    rankingResults.sort((a, b) => a.daysUntilStale - b.daysUntilStale);

    if (rankingResults.length === 0) {
        throw new Error("No items exist in the database to re-price");
    }
    return ljs(rankingResults.slice(0, limit))
        .filter((result) => result.daysUntilStale <= 0)
        .map((result) => result.itemName);
}

export function estimateDaysToImpactfulPriceChange(
    listings: Listing[],
): number {
    if (listings.length === 0) {
        return 0;
    }

    const marketPrice = listings[0].price;

    return (
        7 +
        // Wait longer to re-check junk
        30 * likelyToStayJunk(marketPrice) +
        // Wait longer to re-check expensive stuff
        10 * likelyToStayExpensive(marketPrice) +
        // Expedite if the listings are shallow
        -4 * liquidityIsShallow(listings) +
        // Expedite if it's in a price we often invest in
        -3 * isLikelyToInvestIn(marketPrice)
    );
}

// Junk is unlikely to suddenly become valuable
function likelyToStayJunk(marketPrice: number) {
    if (marketPrice > 1000) {
        return 0;
    }

    // 1   if worth 100
    // 0.3 if worth 500
    // 0   if worth 1000
    return 3 - Math.log10(marketPrice);
}

// A shallow liquidity means prices can swing quickly.
// It can also mean we got incomplete results in the previous scrape
function liquidityIsShallow(listings: Listing[]) {
    if (!listings[1]) {
        if (listings[0].userName === "NOT_A_REAL_USER!") {
            // It's a dummy listing for unbuyables
            return 0;
        }

        // Only have a single listing, very shallow
        return 1;
    }
    const priceGap = listings[1].price - listings[0].price;
    const volatilityFactor = priceGap / listings[0].price;

    if (priceGap < 1000 || volatilityFactor < 0.05) {
        return 0;
    }

    if (priceGap > 10000 && volatilityFactor > 0.4) {
        return 1;
    }

    return 4 - Math.log10(priceGap);
}

function likelyToStayExpensive(marketPrice: number) {
    if (marketPrice > 100000) {
        return 1;
    }

    if (marketPrice < 10000) {
        return 0;
    }

    // 1   if 100000
    // 0.7 if 50000
    // 0   if 10000
    return Math.log10(marketPrice) - 4;
}

// We end up buying a lot of items in the mid 1000s,
// so we're highly exposed to small price fluctuations.
// Precise prices are particularly valuable in this range.
function isLikelyToInvestIn(marketPrice: number) {
    if (marketPrice < 2000 || marketPrice > 7000) {
        return 0;
    }

    return 1;
}
