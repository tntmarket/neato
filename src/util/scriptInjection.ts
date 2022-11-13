import browser from "webextension-polyfill";

export function ensureListener<T extends (...args: any[]) => any>(
    handleMessage: T,
) {
    if (browser.runtime.onMessage.hasListeners()) {
        console.log("Existing script is registered!");
    }

    browser.runtime.onMessage.addListener((request) => {
        console.log("REQUEST", request);
        return handleMessage(request);
    });
    window.addEventListener("unload", () => {
        console.log("UNLOAD");
        browser.runtime.onMessage.removeListener(handleMessage);
    });
}