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
import { ListingBrowser } from "@src/controlPanel/ListingBrowser";
import { MyShopStockBrowser } from "@src/controlPanel/MyShopStockBrowser";
import { withdrawShopTill } from "@src/contentScriptActions/shopTill";

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
        }
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
    const itemsToReprice = await getNextItemsToReprice(40);
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
    currentAccountCanSearch: boolean,
    shopIds: number[],
    switchAccount: (accountId: number) => Promise<void>,
    switchToUnbannedAccount: () => Promise<boolean>,
    recordBanTime: () => void,
) {
    async function repriceItems() {
        if (currentAccountCanSearch) {
            const { tooManySearches } = await repriceStalestItems();
            if (tooManySearches) {
                recordBanTime();
            }
            return tooManySearches;
        }
        return true;
    }

    if (loggedIntoMainAccount) {
        await withdrawShopTill();
        await cycleThroughShopsUntilNoProfitableItems(shopIds);
        await quickStockItems();
        await undercutMarketPrices();

        const tooManySearches = await repriceItems();
        if (tooManySearches) {
            const unbannedAccount = await switchToUnbannedAccount();
            if (!unbannedAccount) {
                // If we have no accounts available, just wait instead of
                // immediately starting another restocking run
                await waitTillNextHour();
            }
        }
    } else {
        await repriceItems();
        // Return to main to interleave a restocking run before the next shop wizard run
        await switchAccount(0);
    }
}

const shopIdsSetting = getJsonSetting("shopIds", [1, 7, 14, 15, 98]);

const CONSECUTIVE_FAILURES_BEFORE_ABORT = 10;

export function ControlPanel() {
    const [shopIds, setShopIds] = useState(shopIdsSetting.get());
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);
    const [retryInfinitely, setRetryInfinitely] = useState(false);
    const [isAutomating, setIsAutomating] = useState(false);

    const {
        loggedIntoMainAccount,
        currentAccountCanSearch,
        switchAccount,
        switchToUnbannedAccount,
        accountsUI,
        recordBanTime,
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
                console.error("ERROR", error);
            }
        });
    }, []);

    useEffect(() => {
        if (isAutomating) {
            restockAndReprice(
                loggedIntoMainAccount,
                currentAccountCanSearch,
                shopIds,
                switchAccount,
                switchToUnbannedAccount,
                recordBanTime,
            )
                .then(() => {
                    setConsecutiveFailures(0);
                })
                .catch((error) => {
                    setConsecutiveFailures(
                        (consecutiveFailures) => consecutiveFailures + 1,
                    );
                    console.error(error);
                })
                .finally(() => {
                    setIsAutomating(false);
                });
        } else if (retryInfinitely) {
            if (consecutiveFailures < CONSECUTIVE_FAILURES_BEFORE_ABORT) {
                setIsAutomating(true);
            } else {
                setRetryInfinitely(false);
            }
        }
    }, [isAutomating]);

    return (
        <div className={`bg-base-100 ${css.controlPanel}`}>
            <OnOffToggle
                label={`Keep Retrying - ${consecutiveFailures}/${CONSECUTIVE_FAILURES_BEFORE_ABORT}`}
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
            <ListingBrowser />
            <MyShopStockBrowser />
        </div>
    );
}
