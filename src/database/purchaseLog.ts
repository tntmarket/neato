import { db } from "@src/database/databaseSchema";

export type PurchaseEntry = PurchaseEntryData & {
    purchaseTime: number;
};
export type PurchaseEntryData = {
    itemName: string;
    price: number;
};

export async function recordPurchase(purchase: PurchaseEntryData) {
    return db.transaction("rw", db.purchases, () =>
        db.purchases.add({
            purchaseTime: Date.now(),
            ...purchase,
        }),
    );
}

export async function getPurchaseLog(limit = 50): Promise<PurchaseEntry[]> {
    return db.transaction("r", db.purchases, () => {
        const purchases = db.purchases.orderBy("purchaseTime").reverse();
        return limit ? purchases.limit(limit).toArray() : purchases.toArray();
    });
}
