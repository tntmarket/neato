import browser from "webextension-polyfill";
import { ensureOneTab } from "@src/util/tabControl";

ensureOneTab(browser.runtime.getURL("controlPanel.html"));

browser.action.onClicked.addListener(async () => {
    const tab = await ensureOneTab(browser.runtime.getURL("controlPanel.html"));
    await browser.tabs.update(tab.id, { active: true });
});
