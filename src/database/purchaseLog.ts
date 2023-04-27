import { db } from "@src/database/databaseSchema";
import { getMarketPrice } from "@src/database/listings";
import { getJellyNeoEntry } from "@src/database/jellyNeo";
import { underCut } from "@src/autoRestock/buyingItems";

export type RestockAttempt = RestockAttemptData & {
    time: number;
};

export type RestockAttemptData =
    | Purchase
    | {
          status: "SOLD_OUT";
          shopId: number;
          itemName: string;
      }
    | {
          status: "NOTHING_WORTH_BUYING";
          shopId: number;
      }
    | {
          status: "NPC_SHOP_IS_EMPTY";
          shopId: number;
      };

type Purchase = {
    status: "OFFER_ACCEPTED";
    shopId: number;
    itemName: string;
    price: number;
};

type PurchaseWithProfit = Purchase & {
    time: number;
    profit: number;
    rarity: number | 0;
};

export async function recordRestockAttempt(attempt: RestockAttemptData) {
    return db.transaction("rw", db.restockAttempts, () =>
        db.restockAttempts.add({
            time: Date.now(),
            ...attempt,
        }),
    );
}

async function getPurchasesWithProfit(
    attempts: RestockAttempt[],
): Promise<PurchaseWithProfit[]> {
    return Promise.all(
        attempts
            .filter((attempt) => attempt.status === "OFFER_ACCEPTED")
            .map(async (attempt) => {
                if (attempt.status !== "OFFER_ACCEPTED") {
                    throw new Error("Failed to filter OFFER_ACCEPTED");
                }
                const marketPrice = await getMarketPrice(attempt.itemName);
                const jellyNeoEntry = await getJellyNeoEntry(attempt.itemName);
                return {
                    ...attempt,
                    profit:
                        marketPrice > 0
                            ? underCut(marketPrice) - attempt.price
                            : 0,
                    rarity: jellyNeoEntry?.rarity || 0,
                };
            }),
    );
}

export type ProfitReport = {
    profitPerShop: ShopReportDetailed[];
    totalProfit: number;
    totalCost: number;
    purchases: PurchaseWithProfit[];

    totalRefreshes: number;
    totalStockedRefreshes: number;
    profitPerRefresh: number;
    profitPerStockedRefresh: number;

    countsOverTime: CountsOverTime;
};

type CountsOverTime = {
    time: number[];
} & {
    [Property in keyof OutcomeCounts]: OutcomeCounts[Property][];
};

export type ShopReport = OutcomeCounts & {
    shopId: number;
    cost: number;
    profit: number;
};

type OutcomeCounts = {
    nothingStockedCount: number;
    nothingWorthBuyingCount: number;
    purchaseCount: number;
    soldOutCount: number;
};

export type ShopReportDetailed = ShopReport & {
    profitPercent: number;

    totalRefreshes: number;
    totalStockedRefreshes: number;

    profitPerRefresh: number;
    profitPerStockedRefresh: number;
};

export type ReportByShop = {
    [shopId: number]: ShopReport;
};

export function timeStringToTimestamp(timeString: string): number {
    if (timeString === "now") {
        return Date.now();
    }
    if (timeString.endsWith("h")) {
        return Date.now() + (parseInt(timeString) || 0) * 1000 * 60 * 60;
    }
    if (timeString.endsWith("m")) {
        return Date.now() + (parseInt(timeString) || 0) * 1000 * 60;
    }
    return new Date(timeString).getTime() || Date.now();
}

type ShopIdToSeconds = {
    [shopId: number]: number;
};

export async function getTimeSinceLastRefresh(
    shopIds: number[],
    defaultSeconds = 3600,
): Promise<ShopIdToSeconds> {
    const restockAttempts = await db.transaction(
        "r",
        db.restockAttempts,
        () => {
            return db.restockAttempts
                .where("time")
                .above(timeStringToTimestamp("-1h"))
                .toArray();
        },
    );

    const now = Date.now();
    const shopIdToTimeSinceLastRefresh: ShopIdToSeconds = {};
    shopIds.forEach((shopId) => {
        shopIdToTimeSinceLastRefresh[shopId] = defaultSeconds;
    });
    restockAttempts.forEach((attempt) => {
        shopIdToTimeSinceLastRefresh[attempt.shopId] =
            (now - attempt.time) / 1000;
    });
    return shopIdToTimeSinceLastRefresh;
}

export async function getProfitReport(
    startTime = "-1h",
    endTime = "now",
    numBuckets = 60,
): Promise<ProfitReport> {
    const reportByShop: ReportByShop = {};

    let totalProfit = 0;
    let totalCost = 0;

    const startTimestamp = timeStringToTimestamp(startTime);
    const endTimestamp = timeStringToTimestamp(endTime);

    const attempts = await db.transaction("r", db.restockAttempts, () => {
        if (endTime === "now") {
            return db.restockAttempts
                .where("time")
                .above(startTimestamp)
                .reverse()
                .toArray();
        }
        return db.restockAttempts
            .where("time")
            .between(startTimestamp, endTimestamp)
            .reverse()
            .toArray();
    });

    attempts.forEach((attempt) => {
        if (reportByShop[attempt.shopId] === undefined) {
            reportByShop[attempt.shopId] = {
                shopId: attempt.shopId,

                nothingStockedCount: 0,
                nothingWorthBuyingCount: 0,
                soldOutCount: 0,
                purchaseCount: 0,

                cost: 0,
                profit: 0,
            };
        }

        const shopReport = reportByShop[attempt.shopId];

        if (attempt.status === "NPC_SHOP_IS_EMPTY") {
            shopReport.nothingStockedCount += 1;
        }

        if (attempt.status === "NOTHING_WORTH_BUYING") {
            shopReport.nothingWorthBuyingCount += 1;
        }

        if (attempt.status === "SOLD_OUT") {
            shopReport.soldOutCount += 1;
        }
    });

    const purchases = await getPurchasesWithProfit(attempts);
    purchases.forEach((purchase) => {
        const shopReport = reportByShop[purchase.shopId];
        shopReport.profit += purchase.profit;
        shopReport.cost += purchase.price;
        shopReport.purchaseCount += 1;

        totalProfit += purchase.profit;
        totalCost += purchase.price;
    });

    const profitPerShop: ShopReportDetailed[] = Object.values(reportByShop).map(
        (report) => {
            const totalStockedRefreshes =
                report.nothingWorthBuyingCount +
                report.purchaseCount +
                report.soldOutCount;
            const totalRefreshes =
                totalStockedRefreshes + report.nothingStockedCount;

            return {
                ...report,

                profitPercent: report.profit / Math.max(totalProfit, 1) || 0,

                totalRefreshes,
                totalStockedRefreshes,

                profitPerRefresh: report.profit / Math.max(totalRefreshes, 1),
                profitPerStockedRefresh:
                    report.profit / Math.max(totalStockedRefreshes, 1) || 0,
            };
        },
    );

    const totalRefreshes = profitPerShop
        .map((report) => report.totalRefreshes)
        .reduce((a, b) => a + b, 0);

    const totalStockedRefreshes = profitPerShop
        .map((report) => report.totalStockedRefreshes)
        .reduce((a, b) => a + b, 0);

    return {
        profitPerShop,
        purchases,
        totalCost,
        totalProfit,
        totalRefreshes,
        profitPerRefresh: totalProfit / Math.max(totalRefreshes, 1),
        totalStockedRefreshes,
        profitPerStockedRefresh:
            totalProfit / Math.max(totalStockedRefreshes, 1),

        countsOverTime: getCountsOverTime(
            attempts,
            Math.round((endTimestamp - startTimestamp) / numBuckets),
        ),
    };
}

function getCountsOverTime(
    attempts: RestockAttempt[],
    millisPerBucket: number,
): CountsOverTime {
    const countsOverTime: CountsOverTime = {
        time: [],
        nothingStockedCount: [],
        nothingWorthBuyingCount: [],
        purchaseCount: [],
        soldOutCount: [],
    };

    let currentTimeBucket = null;
    for (const attempt of attempts) {
        const roundedMillis = attempt.time - (attempt.time % millisPerBucket);

        if (!currentTimeBucket || currentTimeBucket !== roundedMillis) {
            currentTimeBucket = roundedMillis;
            countsOverTime.time.unshift(roundedMillis);
            countsOverTime.nothingStockedCount.unshift(0);
            countsOverTime.nothingWorthBuyingCount.unshift(0);
            countsOverTime.purchaseCount.unshift(0);
            countsOverTime.soldOutCount.unshift(0);
        }

        if (attempt.status === "NPC_SHOP_IS_EMPTY") {
            countsOverTime.nothingStockedCount[0] += 1;
        }

        if (attempt.status === "NOTHING_WORTH_BUYING") {
            countsOverTime.nothingWorthBuyingCount[0] += 1;
        }

        if (attempt.status === "OFFER_ACCEPTED") {
            countsOverTime.purchaseCount[0] += 1;
        }

        if (attempt.status === "SOLD_OUT") {
            countsOverTime.soldOutCount[0] += 1;
        }
    }

    return countsOverTime;
}
