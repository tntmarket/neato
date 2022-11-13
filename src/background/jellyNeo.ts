import {
    getJellyNeoEntries,
    JellyNeoEntry,
    JellyNeoEntryData,
    putJellyNeoEntries,
} from "@src/database/jellyNeo";

export async function setItemMonitorList(
    itemsFromJellyNeo: JellyNeoEntryData[],
): Promise<JellyNeoEntry[]> {
    await putJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
