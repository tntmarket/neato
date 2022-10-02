import Dexie from "dexie";
import { NpcStock } from "@src/database/npcStock";
import { User } from "@src/database/user";
import { Listing } from "@src/database/listings";
import { JellyNeoEntry } from "@src/database/jellyNeo";

class Database extends Dexie {
    listings!: Dexie.Table<Listing>;
    npcStock!: Dexie.Table<NpcStock>;
    frozenUsers!: Dexie.Table<User>;
    jellyNeo!: Dexie.Table<JellyNeoEntry>;

    constructor() {
        super("NeatoDatabase");
        this.version(5).stores({
            jellyNeo: "id,itemName,rarity,price",
            listings: "[itemName+userName],price,lastSeen,link",
            npcStock: "itemName,price,shopId,lastSeen",
            frozenUsers: "userName",
        });
    }
}

export const db = new Database();

