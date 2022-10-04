import browser from "webextension-polyfill";
import { HaggleSituation } from "@src/contentScripts/haggle";
import { sleep } from "@src/util/randomDelay";

export async function ensureHaggleScriptInjected(tabId: number) {
    return browser.scripting.executeScript({
        target: {
            tabId,
        },
        files: ["js/haggle.js"],
    });
}

export async function makeHaggleOffer(
    tabId: number,
    haggleOffer: number,
): Promise<HaggleSituation> {
    return new Promise(async (resolve) => {
        console.log("MAKING OFFER");
        await browser.tabs.sendMessage(tabId, {
            action: "MAKE_HAGGLE_OFFER",
            offer: haggleOffer,
        });

        console.log("WAITING FOR HAGGLE TO REFRESH");
        const pollForPageChange = setInterval(async () => {
            const tab = await browser.tabs.get(tabId);
            console.log(tab.status);
            if (tab.status === "complete") {
                await ensureHaggleScriptInjected(tabId);
                clearInterval(pollForPageChange);
                resolve(await getHaggleSituation(tabId));
            }
        }, 100);
    });
}

export async function getHaggleSituation(
    tabId: number,
): Promise<HaggleSituation> {
    return browser.tabs.sendMessage(tabId, {
        action: "GET_HAGGLE_SITUATION",
    });
}
