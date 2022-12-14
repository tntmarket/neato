import { db } from "@src/database/databaseSchema";

export type StockedItem = {
    itemName: string;
    quantity: number;
    price: number;
};
export type ShopStockResults = {
    stock: StockedItem[];
    hasMore: boolean;
};

export function addStockedItems(stockedItems: StockedItem[]): Promise<void> {
    return db.transaction("rw", db.myShopStock, async () => {
        await db.myShopStock.clear();
        await db.myShopStock.bulkPut(stockedItems);
    });
}

export function getCurrentShopStock(itemName: string): Promise<number> {
    return db.transaction("r", db.myShopStock, async () => {
        const stockItem = await db.myShopStock.where({ itemName }).first();
        return stockItem ? stockItem.quantity : 0;
    });
}

export function getAllStockedItems(): Promise<StockedItem[]> {
    return db.transaction("r", db.myShopStock, async () => {
        return db.myShopStock.toArray();
    });
}

export function incrementStock(itemName: string): Promise<void> {
    return db.transaction("rw", db.myShopStock, async () => {
        let stockItem = await db.myShopStock.where({ itemName }).first();
        if (!stockItem) {
            stockItem = {
                itemName,
                quantity: 0,
                price: 0,
            };
        }

        await db.myShopStock.put({
            ...stockItem,
            quantity: stockItem.quantity + 1,
        });
    });
}
