import browser from "webextension-polyfill";
import { Tabs } from "webextension-polyfill/namespaces/tabs";
import { addNpcStocks, NpcStockData } from "@src/database/npcStock";
import { assume } from "@src/util/typeAssertions";
import { ensureHaggleScriptInjected } from "@src/contentScriptActions/makeHaggleOffer";
import { HaggleSituation } from "@src/contentScripts/haggle";
import {
    waitForTabStatusChange,
    waitForTabUrlToMatch,
} from "@src/util/tabControl";
import { l } from "@src/util/logging";

function shopUrl(shopId: number) {
    return `https://www.neopets.com/objects.phtml?type=shop&obj_type=${shopId}`;
}

export async function getNpcStockTab(
    shopId: number,
): Promise<{ tab: Tabs.Tab; justRefreshed: boolean }> {
    const tabs = await browser.tabs.query({
        url: shopUrl(shopId),
    });
    let tab = tabs[0];

    if (!tab) {
        // Move back to the Npc Shop from the haggle screen
        const existingHaggleTab = await browser.tabs.query({
            url: "https://www.neopets.com/haggle.phtml*",
        });
        if (existingHaggleTab[0]) {
            tab = await browser.tabs.update(existingHaggleTab[0].id, {
                url: shopUrl(shopId),
            });

            await waitForTabUrlToMatch(assume(tab.id), "type=shop");
        } else {
            tab = await browser.tabs.create({
                url: shopUrl(shopId),
            });
        }
        return { tab, justRefreshed: true };
    }

    if (tabs.length > 1) {
        throw new Error("We can only have one tab for each shop open");
    }

    return { tab, justRefreshed: false };
}

export async function ensureNpcShopScript(tab: Tabs.Tab) {
    await browser.scripting.executeScript({
        target: {
            tabId: assume(tab.id),
        },
        files: ["js/npcShop.js"],
    });
}

export async function getNpcShopStock(
    tabId: number,
    shopId: number,
): Promise<NpcStockData[]> {
    const npcStock = await browser.tabs.sendMessage(tabId, {
        action: "GET_NPC_STOCK",
    });

    await addNpcStocks(shopId, npcStock);

    return npcStock;
}

export class HaggleSession {
    tabId: number;
    itemName: string;

    constructor(tabId: number, itemName: string) {
        this.tabId = tabId;
        this.itemName = itemName;
    }

    static async start(
        tabId: number,
        itemName: string,
    ): Promise<HaggleSession> {
        const session = new HaggleSession(tabId, itemName);

        await browser.tabs.sendMessage(tabId, {
            action: "HAGGLE_FOR_ITEM",
            itemName,
        });
        await waitForTabUrlToMatch(tabId, "haggle");
        await ensureHaggleScriptInjected(tabId);

        return session;
    }

    async makeOffer(offer: number): Promise<void> {
        await browser.tabs.sendMessage(this.tabId, {
            action: "MAKE_HAGGLE_OFFER",
            offer,
        });

        await waitForTabStatusChange(this.tabId, "loading");
        await waitForTabStatusChange(this.tabId, "complete");
        await ensureHaggleScriptInjected(this.tabId);
    }

    async getSituation(): Promise<HaggleSituation> {
        return browser.tabs.sendMessage(this.tabId, {
            action: "GET_HAGGLE_SITUATION",
        });
    }
}
