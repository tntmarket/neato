import Dexie from "dexie";
import { getOtherCharsInSection } from "@src/database/shopWizardSection";

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

type User = {
    userName: string;
};

class Database extends Dexie {
    listings!: Dexie.Table<Listing>;
    frozenUsers!: Dexie.Table<User>;

    constructor() {
        super("NeatoDatabase");
        this.version(3).stores({
            listings: "[itemName+userName],price,lastSeen,link",
            frozenUsers: "userName",
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
        console.log("BLAH");
        await db.transaction("rw", db.listings, () =>
            db.listings.bulkPut(
                listings.map((listing) => ({
                    itemName,
                    lastSeen,
                    ...listing,
                })),
            ),
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

        const now = Date.now();
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

            db.listings.bulkAdd(
                listings.map((listing) => ({
                    itemName,
                    lastSeen: now,
                    ...listing,
                })),
            );
        });
    }

    updateListingQuantity(link: string, quantity: number): Promise<void> {
        return db.transaction("rw", db.listings, async () => {
            await db.listings.where({ link }).modify({ quantity });
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
}

export const db = new Database();
