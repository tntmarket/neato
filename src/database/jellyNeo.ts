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

export async function putJellyNeoEntries(entries: JellyNeoEntryData[]) {
    const now = Date.now();
    return db.transaction("rw", db.jellyNeo, async () => {
        await db.jellyNeo.clear();
        await db.jellyNeo.bulkPut(
            entries.map((entry) => ({
                ...entry,
                lastSeen: now,
            })),
        );
    });
}

export async function getJellyNeoEntry(
    itemName: string,
): Promise<JellyNeoEntry | undefined> {
    return db.transaction("r", db.jellyNeo, () =>
        db.jellyNeo.where({ itemName }).first(),
    );
}

export async function getJellyNeoEntries(): Promise<JellyNeoEntry[]> {
    return db.transaction("r", db.jellyNeo, () => db.jellyNeo.toArray());
}

export async function setItemMonitorList(
    itemsFromJellyNeo: JellyNeoEntryData[],
): Promise<JellyNeoEntry[]> {
    await putJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
