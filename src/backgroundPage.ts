import browser from "webextension-polyfill";
import { getProcedure } from "@src/background/procedure";

browser.runtime.onMessage.addListener(async (request, sender) => {
    const procedure = getProcedure(request);
    return procedure(request);
});
