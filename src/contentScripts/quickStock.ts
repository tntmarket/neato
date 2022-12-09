import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener } from "@src/util/scriptInjection";
import {
    MAX_COPIES_TO_SHELVE,
    MIN_PROFIT,
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

    if (itemName.includes("Dubloon Coin")) {
        return;
    }

    // Deposit junk
    const listing = (await callProcedure(getListings, itemName))[0];
    const currentStock = await callProcedure(getCurrentShopStock, itemName);
    if (listing) {
        itemLabel.append(` | ${listing.price}`);
    }
    if (currentStock > 0) {
        itemLabel.append(` | ${currentStock}`);
    }

    if (listing && listing.price < MIN_PROFIT) {
        depositButton.click();
        depositedAnything = true;
        return;
    }

    // Stock until the max number of copies
    const aboutToBeStocked = quantityAboutToBeStocked.get(itemName) || 0;

    if (currentStock + aboutToBeStocked < MAX_COPIES_TO_SHELVE) {
        stockButton.click();
        quantityAboutToBeStocked.set(itemName, aboutToBeStocked + 1);
        stockedAnything = true;
        return;
    }

    depositButton.click();
    depositedAnything = true;
});

ensureListener((request: { action: "QUICK_STOCK_ITEMS" }) => {
    if (request.action === "QUICK_STOCK_ITEMS") {
        if (depositedAnything || stockedAnything) {
            const submitButton = assume(getInputByValue("Submit"));
            submitButton.click();
        }
        return stockedAnything;
    }
});
