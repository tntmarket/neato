import { getListings, Listing } from "@src/database/listings";
import { daysAgo } from "@src/util/dateTime";
import { ljs } from "@src/util/logging";
import { getNpcStock } from "@src/database/npcStock";
import { getJellyNeoEntries } from "@src/database/jellyNeo";
import { getAllStockedItems } from "@src/database/myShopStock";
import {
    DAYS_BEFORE_REPRICING_SHOP_STOCK,
    MIN_PROFIT,
    MIN_PROFIT_TO_QUICK_BUY,
} from "@src/autoRestock/autoRestockConfig";

type RankingResult = {
    itemName: string;
    price1: number;
    price2: number;
    daysUntilStale: number;
};

function itemNameSet(items: { itemName: string }[]) {
    return new Set(items.map((stock) => stock.itemName));
}

export async function getNextItemsToReprice(limit: number): Promise<string[]> {
    const itemsToMonitor = await getJellyNeoEntries();
    const itemNamesToMonitor = new Set(itemsToMonitor.keys());

    const myStockedItems = await getAllStockedItems();
    const myStockedItemNames = itemNameSet(myStockedItems);
    myStockedItemNames.forEach((itemName) => itemNamesToMonitor.add(itemName));

    const npcStockItems = await getNpcStock();
    const npcStockItemNames = itemNameSet(npcStockItems);
    npcStockItemNames.forEach((itemName) => itemNamesToMonitor.add(itemName));

    const rankingResults: RankingResult[] = [];

    console.time("Calculate pricing priority");
    await Promise.all(
        [...itemNamesToMonitor].map(async (itemName) => {
            const listings = await getListings(itemName, 2);

            if (listings.length === 0) {
                if (myStockedItemNames.has(itemName)) {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: -9999, // always prioritize putting all our items on sale
                    });
                } else if (npcStockItemNames.has(itemName)) {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: -999, // always prioritize price checking never-seen-before npc items
                    });
                } else {
                    rankingResults.push({
                        itemName,
                        price1: 0,
                        price2: 0,
                        daysUntilStale: 0,
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
                    // Always keep our shop inventory fresh
                    daysUntilStale:
                        DAYS_BEFORE_REPRICING_SHOP_STOCK -
                        daysAgo(listings[0].lastSeen),
                });
            } else if (npcStockItemNames.has(itemName)) {
                rankingResults.push({
                    itemName,
                    price1: listings[0].price,
                    price2: listings[1]?.price,
                    daysUntilStale:
                        estimatedDaysUntilPriceChange -
                        daysAgo(listings[0].lastSeen) -
                        // Slightly expedite items that are currently stocked
                        2,
                });
            } else {
                rankingResults.push({
                    itemName,
                    price1: listings[0].price,
                    price2: listings[1]?.price,
                    daysUntilStale:
                        estimatedDaysUntilPriceChange -
                        daysAgo(listings[0].lastSeen),
                });
            }
        }),
    );
    console.timeEnd("Calculate pricing priority");

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
            // .filter((result) => result.daysUntilStale <= 0)
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
        // Generally keep prices 2 weeks fresh
        14 +
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
        // Expedite if it might cross the ignore/buy threshold
        -3 * proximityToBuyThreshold(marketPrice) +
        // Expedite if it might cross the buy/quick-buy threshold
        -2 * proximityToQuickBuyThreshold(marketPrice)
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

function proximityToBuyThreshold(marketPrice: number) {
    /**
     * Example: If market price is 1000, typical profit will be 0,
     * which is -100% of the threshold
     *
     * Example: If market price is 3000, typical profit will be 2000,
     * which is exactly on buy threshold
     *
     * Example: If market price is 5000, typical profit will be 4000,
     * which is +100% of the threshold
     */
    const typicalNpcPrice = 1000;
    const typicalProfit = Math.max(0, marketPrice - typicalNpcPrice);
    const percentageFromThreshold =
        Math.abs(typicalProfit - MIN_PROFIT) / MIN_PROFIT;

    if (percentageFromThreshold > 1) {
        return 0;
    }

    return 1 - percentageFromThreshold;
}

function proximityToQuickBuyThreshold(marketPrice: number) {
    /**
     * Example: If market price is 7000, typical profit will be 5000,
     * which is -50% of the threshold
     *
     * Example: If market price is 12000, typical profit will be 10000,
     * which is exactly on the quick-buy threshold
     *
     * Example: If market price is 17000, typical profit will be 15000,
     * which is +50% of the threshold
     */
    const typicalNpcPrice = 2000;
    const typicalProfit = Math.max(0, marketPrice - typicalNpcPrice);
    const percentageFromThreshold =
        Math.abs(typicalProfit - MIN_PROFIT_TO_QUICK_BUY) /
        MIN_PROFIT_TO_QUICK_BUY;

    if (percentageFromThreshold > 0.5) {
        return 0;
    }

    return (1 - percentageFromThreshold) / 0.5;
}
