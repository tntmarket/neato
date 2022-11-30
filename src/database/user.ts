import { db } from "@src/database/databaseSchema";

export type User = {
    userName: string;
};

let cachedFrozenUserNames: string[] | null = null;

export async function trackUserWasFrozen(userName: string): Promise<void> {
    cachedFrozenUserNames = null;
    await db.transaction("rw", db.frozenUsers, async () => {
        await db.frozenUsers.put({ userName });
    });
}

export async function getFrozenUserNames(): Promise<string[]> {
    if (!cachedFrozenUserNames) {
        const frozenUsers = await db.transaction("r", db.frozenUsers, () =>
            db.frozenUsers.toArray(),
        );
        cachedFrozenUserNames = frozenUsers.map((user) => user.userName);
    }
    return cachedFrozenUserNames;
}
