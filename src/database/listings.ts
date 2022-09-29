import Dexie from "dexie";
import { getOtherCharsInSection } from "@src/database/shopWizardSection";
import { assume } from "@src/util/typeAssertions";

export type Listing = ListingData & {
    itemName: string;
    lastSeen: number;
};

export type ListingData = {
    link: string;
    price: number;
    quantity: number;
    userName: string;
};

export type NpcStock = NpcStockData & {
    shopId: number;
    lastSeen: number;
};

export type NpcStockData = {
    itemName: string;
    price: number;
};

type User = {
    userName: string;
};

class Database extends Dexie {
    listings!: Dexie.Table<Listing>;
    npcStock!: Dexie.Table<NpcStock>;
    frozenUsers!: Dexie.Table<User>;

    constructor() {
        super("NeatoDatabase");
        this.version(4).stores({
            listings: "[itemName+userName],price,lastSeen,link",
            npcStock: "itemName,price,shopId,lastSeen",
            frozenUsers: "userName",
        });
    }

    async addNpcStocks(shopId: number, stocks: NpcStockData[]): Promise<void> {
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

    getNpcStockPrice(itemName: string): Promise<number> {
        return db.transaction("r", db.npcStock, async () => {
            const stock = await db.npcStock
                .where({
                    itemName,
                })
                .first();
            return assume(stock).price;
        });
    }

    async trackUserWasFrozen(userName: string): Promise<void> {
        await db.transaction("rw", db.frozenUsers, async () => {
            await db.frozenUsers.put({ userName });
        });
    }

    async addListings(
        itemName: string,
        lastSeen: number,
        listings: ListingData[],
    ): Promise<void> {
        return db.listings.bulkPut(
            listings.map((listing) => ({
                itemName,
                lastSeen,
                ...listing,
            })),
        );
    }

    // Replaces the previous listings that would've been in the same section
    async upsertListingsSection(
        itemName: string,
        listings: ListingData[],
    ): Promise<void> {
        if (listings.length === 0) {
            return;
        }

        await db.transaction("rw", db.listings, async () => {
            const otherCharsInSection = getOtherCharsInSection(
                listings[0].userName,
            );
            const previousListingsInSection = db.listings
                // E.g. for section 0, matches "itemName (a|n|0)*"
                .where("[itemName+userName]")
                .inAnyRange(
                    otherCharsInSection.map((char) => [
                        [itemName, char],
                        [itemName, char + "\uffff"],
                    ]),
                );

            await previousListingsInSection.delete();

            await db.addListings(itemName, Date.now(), listings);
        });
    }

    updateListing(
        link: string,
        quantity: number,
        price: number,
    ): Promise<void> {
        return db.transaction("rw", db.listings, async () => {
            await db.listings
                .where({ link })
                .modify({ quantity, price, lastSeen: Date.now() });
        });
    }

    clearListing(link: string): Promise<void> {
        return db.transaction("rw", db.listings, async () => {
            await db.listings.where({ link }).delete();
        });
    }

    getListings(itemName: string): Promise<Listing[]> {
        return db.transaction("r", db.listings, db.frozenUsers, async () => {
            const frozenUsers = await db.frozenUsers.toArray();
            const frozenUserNames = frozenUsers.map((user) => user.userName);

            return db.listings
                .where({ itemName })
                .filter(({ userName }) => !frozenUserNames.includes(userName))
                .sortBy("price");
        });
    }

    async getMarketPrice(itemName: string): Promise<number> {
        const listings = await db.getListings(itemName);
        if (listings.length === 0) {
            return 0;
        }
        return listings[0].price;
    }
}

export const db = new Database();
