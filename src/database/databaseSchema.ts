import Dexie from "dexie";
import { NpcStock } from "@src/database/npcStock";
import { User } from "@src/database/user";
import { Listing } from "@src/database/listings";
import { JellyNeoEntry } from "@src/database/jellyNeo";
import { StockedItem } from "@src/database/myShopStock";
import { PurchaseEntry } from "@src/database/purchaseLog";

class Database extends Dexie {
    listings!: Dexie.Table<Listing>;
    npcStock!: Dexie.Table<NpcStock>;
    myShopStock!: Dexie.Table<StockedItem>;
    frozenUsers!: Dexie.Table<User>;
    jellyNeo!: Dexie.Table<JellyNeoEntry>;
    purchases!: Dexie.Table<PurchaseEntry>;

    constructor() {
        super("NeatoDatabase");
        this.version(7).stores({
            listings: "[itemName+userName],price,lastSeen,link",
            npcStock: "itemName,price,shopId,lastSeen",
            myShopStock: "itemName,quantity,price",
            frozenUsers: "userName",
            jellyNeo: "id,itemName,rarity,price",
            purchases: "purchaseTime,itemName",
        });
    }
}

export const db = new Database();
