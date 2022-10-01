import { db } from "@src/database/databaseSchema";

export type JellyNeoEntryData = {
    itemName: string;
    id: number;
    rarity: number;
    price: number | null;
};
export type JellyNeoEntry = JellyNeoEntryData & {
    lastSeen: number;
};

export async function upsertJellyNeoEntries(entries: JellyNeoEntryData[]) {
    const now = Date.now();
    return db.transaction("rw", db.jellyNeo, () =>
        db.jellyNeo.bulkPut(
            entries.map((entry) => ({
                ...entry,
                lastSeen: now,
            })),
        ),
    );
}

export async function getJellyNeoEntries() {
    return db.transaction("r", db.jellyNeo, () => db.jellyNeo.toArray());
}
