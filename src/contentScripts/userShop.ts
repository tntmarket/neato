import { $, domLoaded } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { extractNumber } from "@src/util/textParsing";
import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener(
    (request: { action: "CHECK_USER_SHOP_ITEM" }) => {
        if (request.action === "CHECK_USER_SHOP_ITEM") {
            return checkUserShopItem();
        }
    },
);

export type ShopVisitResult = {
    listing?: {
        link: string;
        price: number;
        quantity: number;
    };
    frozenUser?: string;
    notFound?: true;
};

async function checkUserShopItem(): Promise<ShopVisitResult> {
    await domLoaded();

    const pageText = assume($(".content")).innerText;

    if (pageText.includes("Item not found!")) {
        return {
            notFound: true,
        };
    }

    const userName: string = assume(
        new URLSearchParams(window.location.search).get("owner"),
    );
    if (pageText.includes("The owner of this shop has been frozen!")) {
        return { frozenUser: userName };
    }

    const shopItem = $('table[align="center"]');
    if (!shopItem || shopItem.innerText.trim() === "") {
        // For some reason, we don't always get a "Item not found!" message
        return {
            notFound: true,
        };
    }

    const shopItemParts = shopItem.innerText.split("\n");
    const quantity = parseInt(shopItemParts[2]);
    const price = extractNumber(shopItemParts[3]);
    return {
        listing: {
            price,
            quantity,
            link: location.href
                .replace("&lower=0", "")
                .replace("&buy_obj_confirm=yes", ""),
        },
    };
}
