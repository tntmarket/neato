import browser from "webextension-polyfill";
import { Tabs } from "webextension-polyfill/namespaces/tabs";
import { assume } from "@src/util/typeAssertions";

export async function ensureOneTab(url: string): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({ url });

    if (tabs.length === 0) {
        return browser.tabs.create({ url });
    }

    if (tabs.length > 1) {
        for (let i = 0; i < tabs.length - 1; i += 1) {
            await browser.tabs.remove(assume(tabs[i].id));
        }
    }

    return tabs[0];
}

export async function refreshUrl(url: string) {
    const tabs = await browser.tabs.query({ url });

    let tab = tabs[0];
    if (!tab) {
        tab = await browser.tabs.create({ url });
    } else {
        await browser.tabs.reload(tab.id);
    }

    return tab.id;
}
