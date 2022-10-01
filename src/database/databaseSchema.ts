import Dexie from "dexie";

export type JellyNeoEntryData = {
    itemName: string;
    id: number;
    rarity: number;
    price: number | null;
};

export type JellyNeoEntry = JellyNeoEntryData & {
    lastSeen: number;
};

class Database extends Dexie {
    jellyNeo!: Dexie.Table<JellyNeoEntry>;

    constructor() {
        super("Neato");
        this.version(1).stores({
            jellyNeo: "id,itemName,rarity,price",
        });
    }
}

export const backgroundDb = new Database();
