import { db } from "@src/database/databaseSchema";
import { getMarketPrice } from "@src/database/listings";
import { getJellyNeoEntry } from "@src/database/jellyNeo";
import { underCut } from "@src/autoRestock/buyingItems";

export type PurchaseEntry = PurchaseEntryData & {
    purchaseTime: number;
};
export type PurchaseEntryData = {
    shopId: number;
    itemName: string;
    price: number;
};

export type Purchase = PurchaseEntry & {
    profit: number;
    rarity: number | 0;
};

export async function recordPurchase(purchase: PurchaseEntryData) {
    return db.transaction("rw", db.purchases, () =>
        db.purchases.add({
            purchaseTime: Date.now(),
            ...purchase,
        }),
    );
}

async function getPurchases(limit = 50): Promise<Purchase[]> {
    const purchases = await db.transaction("r", db.purchases, () => {
        const purchases = db.purchases.orderBy("purchaseTime").reverse();
        return limit ? purchases.limit(limit).toArray() : purchases.toArray();
    });

    return Promise.all(
        purchases.map(async (purchase) => {
            const marketPrice = await getMarketPrice(purchase.itemName);
            const jellyNeoEntry = await getJellyNeoEntry(purchase.itemName);
            return {
                ...purchase,
                profit:
                    marketPrice > 0
                        ? underCut(marketPrice) - purchase.price
                        : 0,
                rarity: jellyNeoEntry?.rarity || 0,
            };
        }),
    );
}

export type ProfitReport = {
    profitPerShop: ShopReport[];
    totalProfit: number;
    totalCost: number;
    purchases: Purchase[];
};

export type ShopReport = {
    shopId: number;
    profit: number;
    profitPercent: number;
};

export type ProfitPerShop = {
    [shopId: number]: number;
};

export async function getProfitReport(limit = 500): Promise<ProfitReport> {
    const profitPerShop: ProfitPerShop = {};
    let totalProfit = 0;
    let totalCost = 0;

    const purchases = await getPurchases(limit);
    purchases.forEach((purchase) => {
        if (profitPerShop[purchase.shopId] === undefined) {
            profitPerShop[purchase.shopId] = 0;
        }
        profitPerShop[purchase.shopId] += purchase.profit;
        totalProfit += purchase.profit;
        totalCost += purchase.price;
    });

    return {
        profitPerShop: Object.entries(profitPerShop).map(
            ([shopId, profit]) => ({
                shopId: parseInt(shopId),
                profit,
                profitPercent: profit / totalProfit,
            }),
        ),
        purchases,
        totalCost,
        totalProfit,
    };
}
