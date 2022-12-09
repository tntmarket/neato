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

type JellyNeoEntryMap = Map<string, JellyNeoEntry>;

let jellyNeoEntriesPromise: Promise<JellyNeoEntryMap> | null = null;

async function rebuildCache() {
    const cachedEntries: JellyNeoEntryMap = new Map();
    console.log("Re-building JellyNeo cache");
    await db.transaction("r", db.jellyNeo, () =>
        db.jellyNeo.each((entry) => {
            cachedEntries.set(entry.itemName, entry);
        }),
    );
    return cachedEntries;
}

export async function putJellyNeoEntries(entries: JellyNeoEntryData[]) {
    jellyNeoEntriesPromise = null;
    const now = Date.now();
    return db.transaction("rw", db.jellyNeo, async () =>
        db.jellyNeo.bulkPut(
            entries.map((entry) => ({
                ...entry,
                lastSeen: now,
            })),
        ),
    );
}

export async function getJellyNeoEntry(
    itemName: string,
): Promise<JellyNeoEntry | undefined> {
    return (await getJellyNeoEntries()).get(itemName);
}

export async function getJellyNeoEntries(): Promise<JellyNeoEntryMap> {
    if (!jellyNeoEntriesPromise) {
        jellyNeoEntriesPromise = rebuildCache();
    }
    return jellyNeoEntriesPromise;
}

export async function setItemMonitorList(
    itemsFromJellyNeo: JellyNeoEntryData[],
): Promise<JellyNeoEntryMap> {
    await putJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
