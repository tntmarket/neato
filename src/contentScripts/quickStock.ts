import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { callProcedure } from "@src/controlPanel/procedure";
import { ensureListener } from "@src/util/scriptInjection";

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
    } else {
        const depositButton = assume(
            stockButton
                .closest("tr")
                ?.querySelector<HTMLInputElement>('input[value="deposit"]'),
        );
        depositButton.click();
    }
});

ensureListener((request: { action: "QUICK_STOCK_ITEMS" }) => {
    if (request.action === "QUICK_STOCK_ITEMS") {
        const submitButton = assume(getInputByValue("Submit"));
        submitButton.click();
    }
});
