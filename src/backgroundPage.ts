import browser from "webextension-polyfill";
import { getProcedure } from "@src/background/procedure";
import { ensureOneTab } from "@src/util/tabControl";

browser.action.onClicked.addListener(async () => {
    const tab = await ensureOneTab(browser.runtime.getURL("controlPanel.html"));
    await browser.tabs.update(tab.id, { active: true });
});

browser.runtime.onMessage.addListener((request, sender) => {
    if (request.action) {
        // The request is meant for content scripts, ignore it
        return;
    }
    const procedure: (...args: any) => any = getProcedure(request);
    delete request.procedureId;
    return procedure(...request.args);
});
