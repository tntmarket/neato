import React, { useEffect, useState } from "react";
import { OnOffToggle } from "@src/controlPanel/OnOffToggle";
import { PsuedoSuperShopWizard } from "@src/controlPanel/PsuedoSuperShopWizard";
import { checkPrice, PriceCheckOutcome } from "@src/autoRestock/priceChecking";
import { getProcedure } from "@src/controlPanel/procedure";
import { NpcShopInput } from "@src/controlPanel/NpcShopInput";
import { buyBestItemIfAny, BuyOutcome } from "@src/autoRestock/buyingItems";
import { normalDelay } from "@src/util/randomDelay";
import { getJsonSetting } from "@src/util/localStorage";
import { getNextItemsToReprice } from "@src/priceMonitoring";
import { getListings } from "@src/database/listings";
import { undercutMarketPrices } from "@src/contentScriptActions/myShopStock";
import { useAccounts, waitTillNextHour } from "@src/accounts";
import browser from "webextension-polyfill";
import { quickStockItems } from "@src/contentScriptActions/quickStock";
import { MyShopStockBrowser } from "@src/controlPanel/MyShopStockBrowser";
import { withdrawShopTill } from "@src/contentScriptActions/shopTill";
import { PurchaseLog } from "@src/controlPanel/PurchaseLog";
import {
    MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP,
    TIME_BETWEEN_REFRESHES,
    TIME_BETWEEN_RESTOCK_BANS,
    TIME_BETWEEN_RESTOCK_CYCLES,
} from "@src/autoRestock/autoRestockConfig";
import { doDailies } from "@src/contentScriptActions/doDailies";
import { PanelSection } from "@src/controlPanel/PanelSection";

let latestAutomationSessionId = 0;

class AutomationSettingChanged extends Error {}

const MAX_REFRESHES_IN_ONE_SHOP = 20;

export async function buyAllProfitableItems(
    shopId: number,
    automationSessionId: number,
): Promise<BuyOutcome & { boughtAnyItem: boolean }> {
    let boughtAnyItem = false;
    for (
        let refreshCount = 0;
        refreshCount < MAX_REFRESHES_IN_ONE_SHOP;
        refreshCount += 1
    ) {
        const outcome = await buyBestItemIfAny(shopId);
        console.log(outcome);

        if (automationSessionId !== latestAutomationSessionId) {
            throw new AutomationSettingChanged();
        }
        if (outcome.status === "NOTHING_WORTH_BUYING") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "NPC_SHOP_IS_EMPTY") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "OUT_OF_MONEY") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "OUT_OF_SPACE") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "STUCK_IN_LOOP") {
            return { ...outcome, boughtAnyItem };
        }

        if (outcome.status === "OFFER_ACCEPTED") {
            boughtAnyItem = true;
        }
    }
    throw new Error(
        "Refreshing too many times in one shop, something must be wrong",
    );
}

async function cycleThroughShopsUntilNoProfitableItems(
    shopIds: number[],
): Promise<{ sawAnyItem: boolean; boughtAnyItem: boolean }> {
    latestAutomationSessionId += 1;
    let boughtAnyItem = false;
    let sawAnyItem = false;
    const automationSessionId = latestAutomationSessionId;
    let numConsecutiveDroughts = 0;
    while (numConsecutiveDroughts < MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP) {
        let boughtAnyItemInCycle = false;
        for (const shopId of shopIds) {
            const outcome = await buyAllProfitableItems(
                shopId,
                automationSessionId,
            );

            if (outcome.boughtAnyItem) {
                boughtAnyItemInCycle = true;
                boughtAnyItem = true;
            }

            if (outcome.status !== "NPC_SHOP_IS_EMPTY") {
                sawAnyItem = true;
            }

            if (
                ["OUT_OF_MONEY", "OUT_OF_SPACE", "STUCK_IN_LOOP"].includes(
                    outcome.status,
                )
            ) {
                return { boughtAnyItem, sawAnyItem };
            }

            if (
                ["NOTHING_WORTH_BUYING", "NPC_SHOP_IS_EMPTY"].includes(
                    outcome.status,
                )
            ) {
                // Wait before cycling to the next shop
                await normalDelay(TIME_BETWEEN_REFRESHES);
            }
        }
        if (boughtAnyItemInCycle) {
            numConsecutiveDroughts = 0;
        } else {
            numConsecutiveDroughts += 1;
        }
    }
    const restockBanned = !sawAnyItem;
    if (restockBanned) {
        // Wait longer if we are restock banned
        await normalDelay(TIME_BETWEEN_RESTOCK_BANS);
    }
    return { boughtAnyItem, sawAnyItem };
}

async function repriceStalestItems(
    numItemsToReprice: number,
): Promise<PriceCheckOutcome> {
    const itemsToReprice = await getNextItemsToReprice(numItemsToReprice);
    if (itemsToReprice.length === 0) {
        return {};
    }

    for (const item of itemsToReprice) {
        const priceBefore = await getListings(item);
        const priceCheckOutcome = await checkPrice(item);
        if (
            priceCheckOutcome.tooManySearches ||
            priceCheckOutcome.onFairyQuest
        ) {
            return priceCheckOutcome;
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
    recordFairyQuest: () => void,
) {
    console.clear();

    async function repriceItems(numItemsToReprice: number) {
        if (currentAccountCanSearch) {
            const { tooManySearches, onFairyQuest } = await repriceStalestItems(
                numItemsToReprice,
            );
            if (tooManySearches) {
                recordBanTime();
            }
            if (onFairyQuest) {
                recordFairyQuest();
            }
            return { tooManySearches, anySearchWasDone: true };
        }
        return { tooManySearches: true, anySearchWasDone: false };
    }

    const autoBuy = Boolean(shopIds.length > 0);
    if (loggedIntoMainAccount) {
        if (autoBuy) {
            await withdrawShopTill();
            await cycleThroughShopsUntilNoProfitableItems(shopIds);
            await quickStockItems();
        }

        const { tooManySearches, anySearchWasDone } = await repriceItems(20);
        if (anySearchWasDone) {
            await undercutMarketPrices();
        }
        if (tooManySearches) {
            const unbannedAccount = await switchToUnbannedAccount();
            if (!unbannedAccount) {
                if (autoBuy) {
                    // If we have no accounts available, just wait instead of
                    // immediately starting another restocking run
                    await normalDelay(TIME_BETWEEN_RESTOCK_CYCLES);
                } else {
                    // If we're not auto buying, wait until shop wizard ban is up
                    await waitTillNextHour();
                }
                return;
            }
        }
    } else {
        const { anySearchWasDone } = await repriceItems(60);
        if (autoBuy) {
            // Return to main to interleave a restocking run before the next shop wizard run
            await switchAccount(0);
            if (anySearchWasDone) {
                await undercutMarketPrices();
            }
        } else {
            // Cycle to next account if we're in pure shop wizard mode
            const unbannedAccount = await switchToUnbannedAccount();
            if (!unbannedAccount) {
                await waitTillNextHour();
            }
        }
    }
}

const shopIdsSetting = getJsonSetting("shopIds", [1, 7, 14, 15, 98, 4]);

const CONSECUTIVE_FAILURES_BEFORE_ABORT = 10;

export function ControlPanel() {
    const [shopIds, setShopIds] = useState(shopIdsSetting.get());
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);
    const [isAutomating, setIsAutomating] = useState(false);

    const [isDoingDailies, setIsDoingDailies] = useState(false);

    const {
        loggedIntoMainAccount,
        currentAccountCanSearch,
        switchAccount,
        switchToUnbannedAccount,
        accountsUI,
        recordBanTime,
        recordFairyQuest,
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
        if (consecutiveFailures >= CONSECUTIVE_FAILURES_BEFORE_ABORT) {
            setIsAutomating(false);
        }

        if (isAutomating) {
            restockAndReprice(
                loggedIntoMainAccount,
                currentAccountCanSearch,
                shopIds,
                switchAccount,
                switchToUnbannedAccount,
                recordBanTime,
                recordFairyQuest,
            )
                .then(() => {
                    setConsecutiveFailures(0);
                })
                .catch((error) => {
                    setConsecutiveFailures(
                        (consecutiveFailures) => consecutiveFailures + 1,
                    );
                    console.error(error);
                });
        }
    }, [isAutomating]);

    return (
        <div className="bg-base-100 p-2 min-w-fit prose">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <button
                        className={`btn btn-outline ${
                            isDoingDailies ? "loading" : ""
                        }`}
                        disabled={isDoingDailies}
                        onClick={async () => {
                            if (!isDoingDailies) {
                                setIsDoingDailies(true);
                                await doDailies();
                                setIsDoingDailies(false);
                            }
                        }}
                    >
                        Do Dailies
                    </button>
                </div>
                <OnOffToggle
                    label={`Automate - ${consecutiveFailures}/${CONSECUTIVE_FAILURES_BEFORE_ABORT}`}
                    checked={isAutomating}
                    onChange={() => {
                        if (!isAutomating) {
                            setIsAutomating(true);
                        }
                        if (isAutomating) {
                            setIsAutomating(false);
                        }
                    }}
                />
            </div>

            <PanelSection name="Configuration">
                <div className="grid grid-cols-2 gap-4">
                    <div>{accountsUI}</div>
                    <div>
                        <NpcShopInput
                            value={shopIds}
                            onChange={(shopIds) => {
                                setShopIds(shopIds);
                                shopIdsSetting.set(shopIds);
                            }}
                        />
                    </div>
                </div>
            </PanelSection>

            <PanelSection name="Psuedo Super Shop Wizard">
                <PsuedoSuperShopWizard
                    onSearch={async (itemName: string) => {
                        await checkPrice(itemName, 100);
                    }}
                />
            </PanelSection>

            <PanelSection name="Shop Inventory">
                <MyShopStockBrowser />
            </PanelSection>

            <PanelSection name="Purchase and Profit">
                <PurchaseLog />
            </PanelSection>
        </div>
    );
}
