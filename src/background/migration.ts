import { Listing } from "@src/database/listings";
import { User } from "@src/database/user";
import { db } from "@src/database/databaseSchema";
import { callProcedure } from "@src/background/procedure";

export async function upsertListings(listings: Listing[]) {
    console.log(listings[0].itemName);
    return db.transaction("rw", db.listings, async () => {
        await db.listings.bulkPut(listings);
    });
}

export async function upsertFrozenUser(user: User) {
    return db.transaction("rw", db.frozenUsers, async () => {
        await db.frozenUsers.put(user);
    });
}

export async function showTables() {
    db.transaction("r", db.frozenUsers, db.listings, async () => {
        console.log(await db.frozenUsers.toArray());
        console.log(await db.listings.toArray());
    });
}

export async function migrateContentScriptDBToBackground() {
    const allItemNames = await db.transaction("r", db.listings, () =>
        db.listings.orderBy("itemName").uniqueKeys(),
    );
    for (const itemName of allItemNames) {
        const listings = await db.transaction("r", db.listings, async () => {
            return db.listings.where({ itemName }).toArray();
        });
        await callProcedure(upsertListings, listings);
    }

    const frozenUsers = await db.transaction("r", db.frozenUsers, async () => {
        return db.frozenUsers.toArray();
    });
    for (const user of frozenUsers) {
        await callProcedure(upsertFrozenUser, user);
    }
    await callProcedure(showTables);
}
