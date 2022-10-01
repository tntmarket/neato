import browser from "webextension-polyfill";
import { getProcedure } from "@src/backgroundHandlers/requestHandler";

browser.runtime.onMessage.addListener(async (request, sender) => {
    const procedure = getProcedure(request);
    return procedure(request);
});
