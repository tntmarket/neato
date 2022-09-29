import { $ } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { db } from "@src/database/listings";

function updateStaleListingsBasedOnUserShop() {
    const pageText = assume($(".content")).innerText;

    if (pageText.includes("Item not found!")) {
        db.clearListing(location.href);
    }

    if (pageText.includes("The owner of this shop has been frozen!")) {
        const userName: string = assume(
            new URLSearchParams(window.location.search).get("owner"),
        );
        db.trackUserWasFrozen(userName);
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
    if (!shopItem) {
        return;
    }
    const quantity = parseInt(shopItem.innerText.split("\n")[2]);
    const price = parseInt(
        shopItem.innerText.split("\n")[3].replace(/[^0-9]+/g, ""),
    );
    db.updateListing(
        location.href
            .replace("&lower=0", "")
            .replace("&buy_obj_confirm=yes", ""),
        quantity,
        price,
    );
}

updateStaleListingsBasedOnUserShop();
