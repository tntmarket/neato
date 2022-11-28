import { $, domLoaded } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { extractNumber } from "@src/util/textParsing";
import { callProcedure } from "@src/controlPanel/procedure";
import { trackUserWasFrozen } from "@src/database/user";
import { clearListing, updateListing } from "@src/database/listings";
import { ensureListener } from "@src/util/scriptInjection";

ensureListener((request: { action: "CHECK_USER_SHOP_ITEM" }) => {
    if (request.action === "CHECK_USER_SHOP_ITEM") {
        return checkUserShopItem();
    }
});

async function checkUserShopItem(): Promise<void> {
    await domLoaded();
    const link = location.href
        .replace("&lower=0", "")
        .replace("&buy_obj_confirm=yes", "");

    const pageText = assume($(".content")).innerText;

    if (pageText.includes("Item not found!")) {
        await callProcedure(clearListing, link);
        return;
    }

    const userName: string = assume(
        new URLSearchParams(window.location.search).get("owner"),
    );
    if (pageText.includes("The owner of this shop has been frozen!")) {
        await callProcedure(trackUserWasFrozen, userName);
        return;
    }

    const shopItem = $('table[align="center"]');
    if (!shopItem || shopItem.innerText.trim() === "") {
        // For some reason, we don't always get a "Item not found!" message
        await callProcedure(clearListing, link);
        return;
    }

    const shopItemParts = shopItem.innerText.split("\n");
    const quantity = parseInt(shopItemParts[2]);
    const price = extractNumber(shopItemParts[3]);

    await callProcedure(updateListing, link, quantity, price);
}
