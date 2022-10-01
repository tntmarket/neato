import {
    getJellyNeoEntries,
    JellyNeoEntry,
    JellyNeoEntryData,
    upsertJellyNeoEntries,
} from "@src/database/jellyNeo";

type AddJellyNeoItems = {
    itemsFromJellyNeo: JellyNeoEntryData[];
};

export async function addJellyNeoItems({
    itemsFromJellyNeo,
}: AddJellyNeoItems): Promise<JellyNeoEntry[]> {
    await upsertJellyNeoEntries(itemsFromJellyNeo);
    return getJellyNeoEntries();
}
