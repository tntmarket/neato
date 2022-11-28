import { getListings, Listing } from "@src/database/listings";
import { daysAgo } from "@src/util/dateTime";
import { ljs } from "@src/util/logging";
import { getNpcStock } from "@src/database/npcStock";
import { getJellyNeoEntries } from "@src/database/jellyNeo";
import { getAllStockedItems } from "@src/database/myShopStock";

type RankingResult = {
    itemName: string;
    price1: number;
    price2: number;
    daysUntilStale: number;
};

function itemNameSet(items: { itemName: string }[]) {
    return new Set(items.map((stock) => stock.itemName));
}

export async function getNextItemsToReprice(limit = 20): Promise<string[]> {
    const itemsToMonitor = await getJellyNeoEntries();
    const itemNamesToMonitor = itemNameSet(itemsToMonitor);

    const myStockedItems = await getAllStockedItems();
    const myStockedItemNames = itemNameSet(myStockedItems);
    myStockedItemNames.forEach((itemName) => itemNamesToMonitor.add(itemName));

    const npcStockItems = await getNpcStock();
    const npcStockItemNames = itemNameSet(npcStockItems);
    npcStockItemNames.forEach((itemName) => itemNamesToMonitor.add(itemName));

    const rankingResults: RankingResult[] = [];

    await Promise.all(
        [...itemNamesToMonitor].map(async (itemName) => {
            const listings = await getListings(itemName, 100);

            if (listings.length === 0) {
                if (myStockedItemNames.has(itemName)) {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: -999, // always prioritize putting all our items on sale
                    });
                } else if (npcStockItemNames.has(itemName)) {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: -99, // always prioritize price checking never-seen-before npc items
                    });
                } else {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: -1,
                    });
                }
                return;
            }

            const estimatedDaysUntilPriceChange =
                estimateDaysToImpactfulPriceChange(listings);

            if (myStockedItemNames.has(itemName)) {
                rankingResults.push({
                    itemName,
                    price1: listings[0].price,
                    price2: listings[1]?.price,
                    // Always keep our shop inventory at least 2 days fresh
                    daysUntilStale: 2 - daysAgo(listings[0].lastSeen),
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

    const stalenessBuckets: { [daysUntilStale: number]: RankingResult[] } = {};
    rankingResults.forEach((result) => {
        const daysStale = Math.floor(result.daysUntilStale);
        if (!stalenessBuckets[daysStale]) {
            stalenessBuckets[daysStale] = [];
        }
        stalenessBuckets[daysStale].push(result);
    });
    console.log(stalenessBuckets);

    return ljs(
        rankingResults
            .slice(0, limit)
            .filter((result) => result.daysUntilStale <= 0)
            .map((result) => result.itemName),
    );
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
        // 60 days to check 100np items
        // 42 days to check 200np items
        // 18 days to check 500np items
        60 * likelyToStayJunk(marketPrice) +
        // 20 days to check 100000np items
        // 14 days to check 50000np items
        // 6 days to check 20000np items
        20 * likelyToStayExpensive(marketPrice) +
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

    if (marketPrice < 100) {
        return 1;
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

    if (priceGap < 1000) {
        return 0;
    }

    // 1   if gap is 1000-2000, 2000-4000, 4000-8000
    // 0.5 if gap is 1000-1500, 2000-3000, 4000-6000
    return Math.min(volatilityFactor, 1);
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
