import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener, waitPageUnload } from "@src/util/scriptInjection";
import {
    EASY_TO_SELL_REGEX,
    ITEMS_TO_ALWAYS_DEPOSIT,
    MAX_COPIES_TO_SHELVE,
    MIN_PROFIT_TO_BUY,
    MIN_VALUE_TO_SHELVE,
} from "@src/autoRestock/autoRestockConfig";
import { getCurrentShopStock } from "@src/database/myShopStock";

let depositedAnything = false;
let stockedAnything = false;
const quantityAboutToBeStocked = new Map<string, number>();

$All('input[value="stock"]').forEach(async (stockButton) => {
    const itemLabel = assume(
        stockButton.closest("tr")?.querySelector<HTMLInputElement>("td"),
    );
    const depositButton = assume(
        stockButton
            .closest("tr")
            ?.querySelector<HTMLInputElement>('input[value="deposit"]'),
    );

    const itemName = assume(
        stockButton.closest("tr")?.querySelector("td")?.innerText,
    );

    const listing = (await callProcedure(getListings, itemName))[0];
    const currentStock = await callProcedure(getCurrentShopStock, itemName);
    if (listing) {
        itemLabel.append(` | ${listing.price}`);
    }
    if (currentStock > 0) {
        itemLabel.append(` | ${currentStock}`);
    }

    if (
        (listing && listing.price < MIN_VALUE_TO_SHELVE.get()) ||
        ITEMS_TO_ALWAYS_DEPOSIT.includes(itemName)
    ) {
        depositButton.click();
        depositedAnything = true;
        return;
    }

    // Stock until the max number of copies
    const aboutToBeStocked = quantityAboutToBeStocked.get(itemName) || 0;

    if (
        aboutToBeStocked < MAX_COPIES_TO_SHELVE ||
        itemName.match(EASY_TO_SELL_REGEX)
    ) {
        stockButton.click();
        quantityAboutToBeStocked.set(itemName, aboutToBeStocked + 1);
        stockedAnything = true;
        return;
    }

    depositButton.click();
    depositedAnything = true;
});

ensureListener(async (request: { action: "QUICK_STOCK_ITEMS" }) => {
    if (request.action === "QUICK_STOCK_ITEMS") {
        if (depositedAnything || stockedAnything) {
            const submitButton = assume(getInputByValue("Submit"));
            submitButton.click();
            await waitPageUnload();
        }
        return stockedAnything;
    }
});
