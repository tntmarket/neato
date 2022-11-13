import { assume } from "@src/util/typeAssertions";
import browser from "webextension-polyfill";
import { ShopVisitResult } from "@src/contentScripts/userShop";
import { sleep } from "@src/util/randomDelay";

export async function checkUserShopListing(
    link: string,
): Promise<ShopVisitResult> {
    const userShopTabs = await browser.tabs.query({
        url: "https://www.neopets.com/browseshop.phtml*",
    });
    let tab = userShopTabs[0];
    if (tab) {
        await browser.tabs.update(tab.id, {
            url: `${link}&buy_obj_confirm=yes`,
        });
    } else {
        tab = await browser.tabs.create({ url: link });
    }

    await ensureScriptInjected();

    return browser.tabs.sendMessage(assume(tab.id), {
        action: "CHECK_USER_SHOP_ITEM",
        link,
    });
}

async function ensureScriptInjected() {
    await sleep(2000);
}
