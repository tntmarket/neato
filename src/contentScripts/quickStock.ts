import { assume } from "@src/util/typeAssertions";
import { $All } from "@src/util/domHelpers";
import { getListings } from "@src/database/listings";
import { callProcedure } from "@src/background/procedure";

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
        const donateButton = assume(
            stockButton
                .closest("tr")
                ?.querySelector<HTMLInputElement>('input[value="donate"]'),
        );
        donateButton.click();
    }
});
