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

class Database extends Dexie {
    listings!: Dexie.Table<Listing>;

    constructor() {
        super("NeatoDatabase");
        this.version(1).stores({
            listings: "[itemName+userName],price,lastSeen",
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

            console.log(
                "Delete section's previous listings",
                await previousListingsInSection.toArray(),
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

    getAllListings(): Promise<Listing[]> {
        return db.transaction("r", db.listings, () =>
            db.listings.limit(20000).toArray(),
        );
    }

    getListings(itemName: string): Promise<Listing[]> {
        return db.transaction("r", db.listings, () =>
            db.listings.where({ itemName }).sortBy("price"),
        );
    }
}

export const db = new Database();
