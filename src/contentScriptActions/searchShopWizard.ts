import {
    SearchShopWizard,
    ShopWizardResult,
} from "@src/contentScripts/shopWizard";
import { assume } from "@src/util/typeAssertions";
import browser, { Tabs } from "webextension-polyfill";
import { waitForTabStatus } from "@src/util/tabControl";
import { sleep } from "@src/util/randomDelay";

export async function getShopWizardTab(): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({
        url: [
            "https://www.neopets.com/shops/wizard.phtml",
            "https://www.neopets.com/*destination=%2Fmarket.phtml%3Ftype%3Dwizard",
        ],
    });
    const tab = tabs[0];
    if (tab) {
        await browser.tabs.reload(tab.id, { bypassCache: true });
        return tab;
    }

    return browser.tabs.create({
        url: "https://www.neopets.com/shops/wizard.phtml",
    });
}

export async function searchShopWizard(
    request: SearchShopWizard,
): Promise<ShopWizardResult> {
    const tab = await getShopWizardTab();
    const tabId = assume(tab.id);

    // ensure script injected
    await waitForTabStatus(tabId, "complete");
    await sleep(100);

    return browser.tabs.sendMessage(tabId, {
        action: "SEARCH_SHOP_WIZARD",
        ...request,
    });
}
