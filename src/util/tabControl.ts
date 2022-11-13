import browser from "webextension-polyfill";
import { Tabs } from "webextension-polyfill/namespaces/tabs";

export async function ensureOneTab(url: string): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({ url });
    const tab = tabs[0];
    if (!tab) {
        return browser.tabs.create({ url });
    }

    return tab;
}

export async function waitForTabStatus(
    tabId: number,
    status: "loading" | "complete",
): Promise<void> {
    const tab = await browser.tabs.get(tabId);
    if (tab.status === status) {
        return;
    }

    return new Promise((resolve) => {
        const pollForPageChange = setInterval(async () => {
            const tab = await browser.tabs.get(tabId);
            if (tab.status === status) {
                clearInterval(pollForPageChange);
                resolve();
            }
        }, 100);
    });
}

export function waitForTabUrlToMatch(
    tabId: number,
    url: string,
): Promise<void> {
    return new Promise((resolve) => {
        const pollForPageChange = setInterval(async () => {
            const tab = await browser.tabs.get(tabId);
            if (tab.url?.includes(url)) {
                resolve();
                clearInterval(pollForPageChange);
            }
        }, 100);
    });
}
