import { assume } from "@src/util/typeAssertions";
import browser, { Tabs } from "webextension-polyfill";
import { waitForTabStatus } from "@src/util/tabControl";
import { sleep } from "@src/util/randomDelay";

async function getShopTillTab(): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({
        url: "https://www.neopets.com/market.phtml?type=till*",
    });
    const tab = tabs[0];
    if (tab) {
        await browser.tabs.reload(tab.id, { bypassCache: true });
        return tab;
    }

    return browser.tabs.create({
        url: "https://www.neopets.com/market.phtml?type=till",
    });
}

export async function withdrawShopTill(): Promise<void> {
    const tab = await getShopTillTab();
    const tabId = assume(tab.id);

    // ensure script injected
    await waitForTabStatus(tabId, "complete");
    await sleep(100);

    return browser.tabs.sendMessage(tabId, {
        action: "WITHDRAW_SHOP_TILL",
    });
}
