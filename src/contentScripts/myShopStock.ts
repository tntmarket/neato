import { assume } from "@src/util/typeAssertions";
import { $All, getInputByValue } from "@src/util/domHelpers";
import { ShopStockResults, StockedItem } from "@src/database/myShopStock";
import { ensureListener, onPageUnload } from "@src/util/scriptInjection";

export type NameToPrice = { [itemName: string]: number };

ensureListener(
    (request: {
        action: "SET_USER_SHOP_PRICES";
        itemNameToPrice: NameToPrice;
    }) => {
        if (request.action === "SET_USER_SHOP_PRICES") {
            return setUserShopPrices(request.itemNameToPrice);
        }
    },
);

function getStockRows() {
    return $All('form[action="process_market.phtml"] tr').slice(1, -1);
}

async function setUserShopPrices(
    itemNameToPrice: NameToPrice,
): Promise<ShopStockResults> {
    let anythingOnPageWasChanged = false;

    const newlyStockedItems: StockedItem[] = getStockRows().map((row) => {
        // Show the original price before discounting
        const stockedItem = stockedItemFromRow(row);

        const newPrice = itemNameToPrice[stockedItem.itemName];
        if (newPrice === undefined || newPrice === stockedItem.price) {
            // no changes, just return the same stocked item unchanged
            return stockedItem;
        }

        anythingOnPageWasChanged = true;

        // If price is negative, it means unshelve the item
        if (newPrice < 0) {
            const removeDropdown = assume(
                row.querySelector<HTMLSelectElement>("select"),
            );
            removeDropdown.value = stockedItem.quantity.toString();
            return {
                ...stockedItem,
                quantity: 0,
            };
        }

        const priceInput = assume(
            row.querySelector<HTMLInputElement>('input[type="text"]'),
        );
        priceInput.value = newPrice.toString();
        // Annotate the previous price for easier debugging
        assume(priceInput.parentNode).append(
            ` ${stockedItem.price.toString()}`,
        );
        return {
            ...stockedItem,
            price: newPrice,
        };
    });

    if (anythingOnPageWasChanged) {
        await new Promise<void>((resolve) => {
            onPageUnload(resolve);
            assume(getInputByValue("Update")).click();
        });
    }

    return {
        stock: newlyStockedItems,
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
