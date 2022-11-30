import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { ShopStockResults, StockedItem } from "@src/database/myShopStock";
import { ensureListener } from "@src/util/scriptInjection";

export type NameToPrice = { [itemName: string]: number };

ensureListener(
    (
        request:
            | { action: "GET_USER_SHOP_STOCK" }
            | {
                  action: "SET_USER_SHOP_PRICES";
                  itemNameToPrice: NameToPrice;
              },
    ) => {
        if (request.action === "GET_USER_SHOP_STOCK") {
            return scrapeUserShopStock();
        }

        if (request.action === "SET_USER_SHOP_PRICES") {
            return setUserShopPrices(request.itemNameToPrice);
        }
    },
);

async function scrapeUserShopStock(): Promise<ShopStockResults> {
    return {
        stock: getStockRows().map(stockedItemFromRow),
        hasMore: hasMorePages(),
    };
}

function getStockRows() {
    return $All('form[action="process_market.phtml"] tr').slice(1, -1);
}

async function setUserShopPrices(itemNameToPrice: NameToPrice): Promise<{
    hasMore: boolean;
}> {
    for (const row of getStockRows()) {
        // Show the original price before discounting
        const { itemName } = stockedItemFromRow(row);

        const newPrice = itemNameToPrice[itemName];
        if (!newPrice) {
            continue;
        }
        // If price is negative, it means unshelve the item
        if (newPrice < 0) {
            const removeDropdown = assume(
                row.querySelector<HTMLSelectElement>("select"),
            );
            const quantity =
                removeDropdown.querySelectorAll("option").length - 1;
            removeDropdown.value = quantity.toString();
            continue;
        }
        const priceInput = assume(
            row.querySelector<HTMLInputElement>('input[type="text"]'),
        );
        const currentPrice = parseInt(priceInput.value);

        if (newPrice !== parseInt(priceInput.value)) {
            priceInput.value = newPrice.toString();
            assume(priceInput.parentNode).append(" " + currentPrice.toString());
        }
    }

    await new Promise<void>((resolve) => {
        window.addEventListener("unload", () => resolve());
        assume(getInputByValue("Update")).click();
    });

    return {
        hasMore: hasMorePages(),
    };
}

function hasMorePages(): boolean {
    const nextPageButton = getInputByValue("Next 30");
    if (!nextPageButton) {
        return false;
    }
    return !nextPageButton.disabled;
}

function stockedItemFromRow(row: HTMLElement): StockedItem {
    const priceInput = assume(
        row.querySelector<HTMLInputElement>('input[maxlength="6"]'),
    );

    return {
        itemName: row.innerText.split("\t")[0],
        price: parseInt(priceInput.value),
        quantity: parseInt(row.innerText.split("\t")[2]),
    };
}
