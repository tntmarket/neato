import {
    backgroundDb,
    JellyNeoEntry,
    JellyNeoEntryData,
} from "@src/database/databaseSchema";

type AddJellyNeoItems = {
    itemsFromJellyNeo: JellyNeoEntryData[];
};

export async function upsertJellyNeoEntries(entries: JellyNeoEntryData[]) {
    const now = Date.now();
    return backgroundDb.transaction("rw", backgroundDb.jellyNeo, () =>
        backgroundDb.jellyNeo.bulkPut(
            entries.map((entry) => ({
                ...entry,
                lastSeen: now,
            })),
        ),
    );
}

export async function getJellyNeoEntries() {
    return backgroundDb.transaction("r", backgroundDb.jellyNeo, () =>
        backgroundDb.jellyNeo.toArray(),
    );
}

export async function addJellyNeoItems({
    itemsFromJellyNeo,
}: AddJellyNeoItems): Promise<JellyNeoEntry[]> {
    await upsertJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
