import {
    getJellyNeoEntries,
    JellyNeoEntry,
    JellyNeoEntryData,
    upsertJellyNeoEntries,
} from "@src/database/jellyNeo";

export async function addJellyNeoItems(
    itemsFromJellyNeo: JellyNeoEntryData[],
): Promise<JellyNeoEntry[]> {
    await upsertJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
