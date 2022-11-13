import browser from "webextension-polyfill";
import { HaggleSituation } from "@src/contentScripts/haggle";
import { sleep } from "@src/util/randomDelay";
import { waitForTabStatus } from "@src/util/tabControl";

export async function ensureHaggleScriptInjected(tabId: number) {
    await waitForTabStatus(tabId, "complete");
    await sleep(1000);
}
