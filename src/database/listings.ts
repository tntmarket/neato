import { db } from "@src/database/databaseSchema";
import { getOtherCharsInSection } from "@src/shopWizardSection";
import { getFrozenUserNames } from "@src/database/user";

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
    bustCache(itemName);
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
        const listing = db.listings.where({ link });
        bustCache((await listing.first())?.itemName);
        await listing.modify({
            link: link.replace(
                /buy_cost_neopoints=[0-9]+/,
                `buy_cost_neopoints=${price}`,
            ),
            quantity,
            price,
            lastSeen: Date.now(),
        });

        console.log(await listing.first());
    });
}

export function clearListing(link: string): Promise<void> {
    return db.transaction("rw", db.listings, async () => {
        const listing = db.listings.where({ link });
        bustCache((await listing.first())?.itemName);
        await listing.delete();
    });
}

type CachedListings = Map<string, Listing[]>;

const cachedListings: CachedListings = new Map();

function bustCache(itemName: string | undefined) {
    if (itemName) {
        cachedListings.delete(itemName);
    }
}

export async function getListings(
    itemName: string,
    limit = 2,
): Promise<Listing[]> {
    let cached = cachedListings.get(itemName);
    if (!cached || limit > 2) {
        const listings = await db.transaction("r", db.listings, async () =>
            db.listings.where({ itemName }).sortBy("price"),
        );

        const frozenUserNames = await getFrozenUserNames();
        const unfrozenListings = listings.filter(
            (listing) => !frozenUserNames.includes(listing.userName),
        );

        cached = unfrozenListings.slice(0, limit);
        cachedListings.set(itemName, cached);
    }

    return cached;
}

export async function getMarketPrice(itemName: string): Promise<number> {
    const listings = await getListings(itemName);
    if (listings.length === 0) {
        return 0;
    }
    return listings[0].price;
}
