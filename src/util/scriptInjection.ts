import browser from "webextension-polyfill";

export function ensureListener<T extends (...args: any[]) => any>(
    handleMessage: T,
) {
    if (browser.runtime.onMessage.hasListeners()) {
        console.log("Existing script is registered!");
    }

    browser.runtime.onMessage.addListener(async (request) => {
        console.log("REQUEST", request);
        try {
            const response = await handleMessage(request);
            console.log("RESPONSE", response);
            return response;
        } catch (error) {
            console.error("ERROR", error);
        }
    });
    window.addEventListener("unload", () => {
        console.log("UNLOAD");
        browser.runtime.onMessage.removeListener(handleMessage);
    });
}
