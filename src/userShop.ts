import {$} from "@src/util/domHelpers";
import {assume} from "@src/util/typeAssertions";
import {db} from "@src/database/listings";

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

    const shopItem = $('table[align="center"]');
    if (!shopItem) {
        return;
    }
    const quantity = parseInt(shopItem.innerText.split("\n")[2]);
    console.log(quantity);
    db.updateListingQuantity(location.href, quantity);
}

updateStaleListingsBasedOnUserShop();

