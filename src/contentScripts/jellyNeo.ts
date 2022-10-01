import { $All, domLoaded } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { extractNumber } from "@src/util/testParsing";
import { JellyNeoEntryData } from "@src/database/databaseSchema";
import { l } from "@src/util/logging";
import { callProcedure } from "@src/backgroundHandlers/requestHandler";
import { addJellyNeoItems } from "@src/backgroundHandlers/jellyNeo";

function rowToEntry(row: HTMLElement): JellyNeoEntryData {
    const itemLink = assume(row.querySelector("a"));

    return {
        itemName: itemLink.innerText,
        id: extractNumber(itemLink.href),
        rarity: extractNumber(row.querySelectorAll("small")[0].innerText),
        price: getPrice(row.querySelectorAll("small")[1]),
    };
}

async function addItemsToMonitorList() {
    await domLoaded();

    const response = await callProcedure(addJellyNeoItems, {
        itemsFromJellyNeo: $All("td").map(rowToEntry),
    });

    l(response);
}

function getPrice(priceLabel: HTMLElement | undefined) {
    if (!priceLabel) {
        return 1_000_000;
    }

    if (priceLabel.innerText.includes("Inflation Notice")) {
        return null;
    }
    return extractNumber(priceLabel.innerText);
}

addItemsToMonitorList();
