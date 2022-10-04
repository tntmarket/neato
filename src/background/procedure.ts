import { addJellyNeoItems } from "@src/background/jellyNeo";
import {
    showTables,
    upsertFrozenUser,
    upsertListings,
} from "@src/background/migration";
import { checkPrice } from "@src/autoRestock/priceChecking";
import { buyBestItemIfAny } from "@src/autoRestock/buyingItems";
import { getNextItemsToReprice } from "@src/priceMonitoring";
import { getListings } from "@src/database/listings";
import { undercutMarketPrices } from "@src/contentScriptActions/myShopStock";

const PROCEDURES = [
    addJellyNeoItems,
    upsertListings,
    upsertFrozenUser,
    showTables,
    checkPrice,
    buyBestItemIfAny,
    getNextItemsToReprice,
    getListings,
    undercutMarketPrices,
];

export type Procedure = typeof PROCEDURES[number];

export function getProcedure(request: { procedureId: number }): Procedure {
    const procedure = PROCEDURES[request.procedureId];
    if (!procedure) {
        throw new Error(`Could not find handler for ${request.procedureId}`);
    }
    return procedure;
}

export function callProcedure<F extends Procedure>(
    procedure: F,
    ...args: F extends (...args: infer P) => any ? P : never[]
): Promise<Awaited<ReturnType<F>>> {
    return new Promise<Awaited<ReturnType<F>>>((resolve) => {
        chrome.runtime.sendMessage(
            {
                procedureId: PROCEDURES.indexOf(procedure),
                args,
            },
            resolve,
        );
    });
}
