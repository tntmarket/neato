import {
    clearListing,
    getListings,
    updateListing,
} from "@src/database/listings";
import { trackUserWasFrozen } from "@src/database/user";
import { getJellyNeoEntry, setItemMonitorList } from "@src/database/jellyNeo";

const PROCEDURES = [
    setItemMonitorList,
    getListings,
    trackUserWasFrozen,
    clearListing,
    updateListing,
    getJellyNeoEntry,
];

export type Procedure = typeof PROCEDURES[number];

export function getProcedure(request: { procedureId: number }): Procedure {
    const procedure = PROCEDURES[request.procedureId];
    if (!procedure) {
        throw new Error(`Could not find handler for ${request.procedureId}`);
    }
    return procedure;
}

/* Allows content scripts to query the database */
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
