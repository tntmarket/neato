import { $All } from "@src/util/domHelpers";
import { callProcedure } from "@src/controlPanel/procedure";
import { getMarketPrice } from "@src/database/listings";
import {
    MAX_COPIES_TO_SHELVE,
    MIN_PROFIT,
} from "@src/autoRestock/autoRestockConfig";
import { getCurrentShopStock } from "@src/database/myShopStock";
import { assume } from "@src/util/typeAssertions";

type WarehouseItem = {
    itemName: string;
    quantity: number;
};

const HIDDEN_ITEMS = [
    "Basic Gift Box",
    "Red Worm",
    "Blue Worm",
    "Yellow Worm",
    "Purple Worm",
    "Empty Lantern",
    "Spooky Treasure Map",
    "Petpet Laboratory Map",
    "Forgotten Shore Map Piece",
];

const HIGHLIGHTED_ITEMS = ["Two Dubloon Coin"];

function getWarehouseRows() {
    return $All("tr[bgcolor]").slice(0, -1);
}

function warehouseItemFromRow(row: HTMLElement): WarehouseItem {
    const columns = row.innerText.split("\t");
    return {
        itemName: columns[1].split("\n")[0],
        quantity: parseInt(columns[4]),
    };
}

async function annotateWarehouseRows() {
    for (const row of getWarehouseRows()) {
        const { itemName, quantity } = warehouseItemFromRow(row);
        const price = await callProcedure(getMarketPrice, itemName);
        if (price > 0) {
            row.querySelectorAll("td")[1].append(price.toString());
        }
        if (HIGHLIGHTED_ITEMS.includes(itemName)) {
            row.style.background = "orange";
            continue;
        }

        if (HIDDEN_ITEMS.includes(itemName)) {
            row.style.display = "none";
            continue;
        }

        if (price < MIN_PROFIT) {
            row.style.opacity = "0.2";
            row.style.display = "none";
            continue;
        }

        if (price >= MIN_PROFIT) {
            const currentStock = await callProcedure(
                getCurrentShopStock,
                itemName,
            );
            if (currentStock < MAX_COPIES_TO_SHELVE) {
                row.style.background = "greenyellow";
                const removeInput = assume(row.querySelector("input"));
                removeInput.value = `${Math.min(
                    MAX_COPIES_TO_SHELVE - currentStock,
                    quantity,
                )}`;
                removeInput.dataset.remove_val = "y";
                continue;
            }
        }

        row.style.display = "none";
    }
}

annotateWarehouseRows();
