import { assume } from "@src/util/typeAssertions";
import { $All } from "@src/util/domHelpers";
import { getMarketPrice } from "@src/database/listings";

$All('input[value="stock"]').forEach(async (stockButton) => {
    const itemName = assume(
        stockButton.closest("tr")?.querySelector("td")?.innerText,
    );

    if (itemName.includes("Dubloon Coin")) {
        return;
    }

    const marketPrice = await getMarketPrice(itemName);
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
