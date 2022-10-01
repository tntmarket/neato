import { assume } from "@src/util/typeAssertions";
import { db } from "@src/database/databaseSchema";

export type NpcStock = NpcStockData & {
    shopId: number;
    lastSeen: number;
};
export type NpcStockData = {
    itemName: string;
    price: number;
};

export async function addNpcStocks(
    shopId: number,
    stocks: NpcStockData[],
): Promise<void> {
    if (stocks.length === 0) {
        return;
    }
    await db.transaction("rw", db.npcStock, async () => {
        // clear previous stock
        await db.npcStock.where({ shopId }).delete();

        await db.npcStock.bulkPut(
            stocks.map((stock) => ({
                ...stock,
                shopId,
                lastSeen: Date.now(),
            })),
        );
    });
}

export function getNpcStockPrice(itemName: string): Promise<number> {
    return db.transaction("r", db.npcStock, async () => {
        const stock = await db.npcStock
            .where({
                itemName,
            })
            .first();
        return assume(stock).price;
    });
}
