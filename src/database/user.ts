import { db } from "@src/database/databaseSchema";

export type User = {
    userName: string;
};

export async function trackUserWasFrozen(userName: string): Promise<void> {
    await db.transaction("rw", db.frozenUsers, async () => {
        await db.frozenUsers.put({ userName });
    });
}
