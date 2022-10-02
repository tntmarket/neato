import { addJellyNeoItems } from "@src/background/jellyNeo";
import {
    showTables,
    upsertFrozenUser,
    upsertListings,
} from "@src/background/migration";

const PROCEDURES = [
    addJellyNeoItems,
    upsertListings,
    upsertFrozenUser,
    showTables,
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
    message?: Parameters<F>[0],
): Promise<Awaited<ReturnType<F>>> {
    return new Promise<Awaited<ReturnType<F>>>((resolve) => {
        chrome.runtime.sendMessage(
            {
                procedureId: PROCEDURES.indexOf(procedure),
                ...message,
            },
            resolve,
        );
    });
}
