import {
    SearchShopWizard,
    ShopWizardResult,
} from "@src/contentScripts/shopWizard";
import { shopWizardUrl } from "@src/urls";
import { assume } from "@src/util/typeAssertions";
import browser, { Tabs } from "webextension-polyfill";
import { waitForTabStatusChange } from "@src/util/tabControl";

export async function getShopWizardTab(): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({ url: shopWizardUrl });
    const tab = tabs[0];
    if (!tab) {
        return browser.tabs.create({ url: shopWizardUrl });
    }

    return tab;
}

export async function searchShopWizard(
    request: SearchShopWizard,
): Promise<ShopWizardResult> {
    const tab = await getShopWizardTab();
    const tabId = assume(tab.id);

    await injectScript(tabId);

    console.log("INJECTED");
    const waitForLoading = waitForTabStatusChange(tabId, "loading");
    const result = await browser.tabs.sendMessage(tabId, {
        action: "SEARCH_SHOP_WIZARD",
        ...request,
    });
    console.log("RESULT", result);
    await browser.tabs.reload(tabId, { bypassCache: true });
    console.log("RELOADED");
    await waitForLoading;
    console.log("LOADED");
    await waitForTabStatusChange(tabId, "complete");
    console.log("COMPLETE");

    return result;
}

async function injectScript(tabId: number) {
    await browser.scripting.executeScript({
        target: {
            tabId,
        },
        files: ["js/shopWizard.js"],
    });
}
