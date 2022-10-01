import { $, domLoaded } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { clearListing, updateListing } from "@src/database/listings";
import { normalDelay } from "@src/util/randomDelay";
import {
    overlayUserShopsToVisit,
    tryVisitNextUserShop,
} from "@src/userShopQueue";
import { trackUserWasFrozen } from "@src/database/user";
import { extractNumber } from "@src/util/textParsing";

async function updateStaleListingsBasedOnUserShop() {
    await domLoaded();

    const pageText = assume($(".content")).innerText;

    if (pageText.includes("Item not found!")) {
        return clearListing(location.href);
    }

    if (pageText.includes("The owner of this shop has been frozen!")) {
        const userName: string = assume(
            new URLSearchParams(window.location.search).get("owner"),
        );
        return trackUserWasFrozen(userName);
    }

    const stillWishToBuy = $(
        `a[href="${location.pathname.slice(1)}${
            location.search
        }&buy_obj_confirm=yes"]`,
    );
    if (stillWishToBuy) {
        stillWishToBuy.click();
        return;
    }

    const shopItem = $('table[align="center"]');
    // For some reason, we don't always get a "Item not found!" message
    if (!shopItem || shopItem.innerText.trim() === "") {
        return clearListing(location.href);
    }

    const shopItemParts = shopItem.innerText.split("\n");
    const quantity = parseInt(shopItemParts[2]);
    const price = extractNumber(shopItemParts[3]);
    return updateListing(
        location.href
            .replace("&lower=0", "")
            .replace("&buy_obj_confirm=yes", ""),
        quantity,
        price,
    );
}

overlayUserShopsToVisit();
updateStaleListingsBasedOnUserShop().then(async () => {
    await normalDelay(1111);
    tryVisitNextUserShop();
    setInterval(tryVisitNextUserShop, 10000);
});
