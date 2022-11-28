import React, { useEffect, useState } from "react";
import css from "./styles.module.css";
import { OnOffToggle } from "@src/controlPanel/OnOffToggle";
import { SearchWizardInput } from "@src/controlPanel/SearchWizardInput";
import { checkPrice } from "@src/autoRestock/priceChecking";
import { getProcedure } from "@src/controlPanel/procedure";
import { NpcShopInput } from "@src/controlPanel/NpcShopInput";
import { buyBestItemIfAny, BuyOutcome } from "@src/autoRestock/buyingItems";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { getJsonSetting } from "@src/util/localStorage";
import { getNextItemsToReprice } from "@src/priceMonitoring";
import { getListings } from "@src/database/listings";
import { undercutMarketPrices } from "@src/contentScriptActions/myShopStock";
import { useAccounts, waitTillNextHour } from "@src/accounts";
import browser from "webextension-polyfill";
import { quickStockItems } from "@src/contentScriptActions/quickStock";

let latestAutomationSessionId = 0;

class AutomationSettingChanged extends Error {}

export async function buyAllProfitableItems(
    shopId: number,
    automationSessionId: number,
): Promise<BuyOutcome & { boughtAnyItem: boolean }> {
    let boughtAnyItem = false;
    while (true) {
        const outcome = await buyBestItemIfAny(shopId);
        console.log(outcome);

        if (automationSessionId !== latestAutomationSessionId) {
            throw new AutomationSettingChanged();
        }
        if (outcome.status === "NOTHING_TO_BUY") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "OUT_OF_MONEY") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "STUCK_IN_LOOP") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "OFFER_ACCEPTED") {
            boughtAnyItem = true;
            await sleep(5000);
        }

        await normalDelay(1111);
    }
}

const MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP = 1;

async function cycleThroughShopsUntilNoProfitableItems(
    shopIds: number[],
): Promise<(BuyOutcome & { boughtAnyItem: boolean }) | null> {
    latestAutomationSessionId += 1;
    const automationSessionId = latestAutomationSessionId;
    for (
        let numTimeWithoutBuy = 0;
        numTimeWithoutBuy < MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP;
        numTimeWithoutBuy += 1
    ) {
        for (const shopId of shopIds) {
            const outcome = await buyAllProfitableItems(
                shopId,
                automationSessionId,
            );

            if (outcome.boughtAnyItem) {
                numTimeWithoutBuy = 0;
            }

            if (outcome.status === "OUT_OF_MONEY") {
                return outcome;
            }

            if (outcome.status === "STUCK_IN_LOOP") {
                return outcome;
            }

            if (outcome.status === "NOTHING_TO_BUY") {
                // Wait before cycling to the next shop
                await normalDelay(5555);
            }
        }
    }
    return null;
}

async function repriceStalestItems(): Promise<{ tooManySearches?: true }> {
    const itemsToReprice = await getNextItemsToReprice(10);
    if (itemsToReprice.length === 0) {
        return {};
    }

    for (const item of itemsToReprice) {
        const priceBefore = await getListings(item);
        const { tooManySearches } = await checkPrice(item);
        if (tooManySearches) {
            return { tooManySearches };
        }

        const priceAfter = await getListings(item);
        console.log(
            `${item}\n   ${priceBefore[0]?.price}, ${priceBefore[1]?.price}\n   ${priceAfter[0]?.price}, ${priceAfter[1]?.price}`,
        );
    }

    return {};
}

async function restockAndReprice(
    loggedIntoMainAccount: boolean,
    shopIds: number[],
    switchAccount: (accountId: number) => Promise<void>,
    switchToUnbannedAccount: () => Promise<boolean>,
) {
    if (loggedIntoMainAccount) {
        await cycleThroughShopsUntilNoProfitableItems(shopIds);
        await quickStockItems();
        await undercutMarketPrices();
    }

    const { tooManySearches } = await repriceStalestItems();
    if (tooManySearches) {
        if (!loggedIntoMainAccount) {
            // Interleave restocking runs in between account switches
            return switchAccount(0);
        }
        // Fit in shop wizard runs in between restocking runs
        const unbannedAccount = await switchToUnbannedAccount();
        if (!unbannedAccount) {
            // If we have no accounts available, just wait instead of
            // immediately starting another restocking run
            return waitTillNextHour();
        }
    }
}

const shopIdsSetting = getJsonSetting("shopIds", [1, 7, 14, 15]);

export function ControlPanel() {
    const [shopIds, setShopIds] = useState(shopIdsSetting.get());
    const [retryInfinitely, setRetryInfinitely] = useState(false);
    const [isAutomating, setIsAutomating] = useState(false);

    const {
        loggedIntoMainAccount,
        switchAccount,
        switchToUnbannedAccount,
        accountsUI,
    } = useAccounts();

    useEffect(() => {
        browser.runtime.onMessage.addListener(async (request, sender) => {
            if (request.action) {
                // The request is meant for content scripts, ignore it
                return;
            }
            const procedure: (...args: any) => any = await getProcedure(
                request,
            );
            delete request.procedureId;
            try {
                return procedure(...request.args);
            } catch (error) {
                console.log("ERROR", error);
            }
        });
    }, []);

    useEffect(() => {
        if (isAutomating) {
            restockAndReprice(
                loggedIntoMainAccount,
                shopIds,
                switchAccount,
                switchToUnbannedAccount,
            )
                .catch((error) => {
                    console.log(error);
                })
                .finally(() => {
                    setIsAutomating(false);
                });
        } else if (retryInfinitely) {
            setIsAutomating(true);
        }
    }, [isAutomating]);

    return (
        <div className={`bg-base-100 ${css.controlPanel}`}>
            <OnOffToggle
                label="Retry Infinitely"
                checked={retryInfinitely}
                onChange={() => {
                    setRetryInfinitely(!retryInfinitely);
                }}
            />
            <OnOffToggle
                label="Automate"
                checked={isAutomating}
                onChange={() => {
                    setIsAutomating(!isAutomating);
                }}
            />
            <SearchWizardInput
                onSearch={async (itemName: string) => {
                    await checkPrice(itemName);
                }}
            />
            <NpcShopInput
                value={shopIds}
                onChange={(shopIds) => {
                    setShopIds(shopIds);
                    shopIdsSetting.set(shopIds);
                }}
            />
            {accountsUI}
        </div>
    );
}
