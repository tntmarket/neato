import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener } from "@src/util/scriptInjection";

let buttonsSelected = false;

$All('input[value="stock"]').forEach(async (stockButton) => {
    const itemName = assume(
        stockButton.closest("tr")?.querySelector("td")?.innerText,
    );

    if (itemName.includes("Dubloon Coin")) {
        return;
    }

    const marketPrice = (await callProcedure(getListings, itemName))[0].price;
    if (marketPrice >= 300 || marketPrice === 0) {
        stockButton.click();
        buttonsSelected = true;
    } else {
        const depositButton = assume(
            stockButton
                .closest("tr")
                ?.querySelector<HTMLInputElement>('input[value="deposit"]'),
        );
        depositButton.click();
        buttonsSelected = true;
    }
});

ensureListener((request: { action: "QUICK_STOCK_ITEMS" }) => {
    if (request.action === "QUICK_STOCK_ITEMS") {
        if (buttonsSelected) {
            const submitButton = assume(getInputByValue("Submit"));
            submitButton.click();
        }
    }
});
