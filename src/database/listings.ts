import { db } from "@src/database/databaseSchema";
import { getOtherCharsInSection } from "@src/shopWizardSection";

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

async function addListings(
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
export async function upsertListingsSection(
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

        await addListings(itemName, Date.now(), listings);
    });
}

export function updateListing(
    link: string,
    quantity: number,
    price: number,
): Promise<void> {
    return db.transaction("rw", db.listings, async () => {
        await db.listings.where({ link }).modify({
            link: link.replace(
                /buy_cost_neopoints=[0-9]+/,
                `buy_cost_neopoints=${price}`,
            ),
            quantity,
            price,
            lastSeen: Date.now(),
        });
    });
}

export function clearListing(link: string): Promise<void> {
    return db.transaction("rw", db.listings, async () => {
        await db.listings.where({ link }).delete();
    });
}

export async function getListings(
    itemName: string,
    limit = 2,
): Promise<Listing[]> {
    const listings = await db.transaction(
        "r",
        db.listings,
        db.frozenUsers,
        async () => {
            const frozenUsers = await db.frozenUsers.toArray();
            const frozenUserNames = frozenUsers.map((user) => user.userName);

            return db.listings
                .where({ itemName })
                .filter(({ userName }) => !frozenUserNames.includes(userName))
                .sortBy("price");
        },
    );
    return listings.slice(0, limit);
}

export async function getMarketPrice(itemName: string): Promise<number> {
    const listings = await getListings(itemName);
    if (listings.length === 0) {
        return 0;
    }
    return listings[0].price;
}
