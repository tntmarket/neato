import { assume } from "@src/util/typeAssertions";
import { $All } from "@src/util/domHelpers";
import { db } from "@src/database/listings";

$All('input[value="stock"]').forEach(async (stockButton) => {
    const itemName = assume(
        stockButton.closest("tr")?.querySelector("td")?.innerText,
    );

    if (itemName.includes("Dubloon Coin")) {
        return;
    }

    const marketPrice = await db.getMarketPrice(itemName);
    if (marketPrice > 100) {
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
