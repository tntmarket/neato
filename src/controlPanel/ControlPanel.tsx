import React, { useEffect, useState } from "react";
import css from "./styles.module.css";
import { OnOffToggle } from "@src/controlPanel/OnOffToggle";
import { SearchWizardInput } from "@src/controlPanel/SearchWizardInput";
import { checkPrice } from "@src/autoRestock/priceChecking";
import { callProcedure } from "@src/background/procedure";
import { NpcShopInput } from "@src/controlPanel/NpcShopInput";
import { buyBestItemIfAny, BuyOutcome } from "@src/autoRestock/buyingItems";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { getJsonSetting } from "@src/util/localStorage";
import { getNextItemsToReprice } from "@src/priceMonitoring";
import { getListings } from "@src/database/listings";
import { undercutMarketPrices } from "@src/contentScriptActions/myShopStock";

let latestAutomationSessionId = 0;

class AutomationSettingChanged extends Error {}

export async function buyAllProfitableItems(
    shopId: number,
    automationSessionId: number,
): Promise<BuyOutcome & { boughtAnyItem: boolean }> {
    let boughtAnyItem = false;
    while (true) {
        const outcome = await callProcedure(buyBestItemIfAny, shopId, 555);
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

async function repriceStalestItems() {
    const itemsToReprice = await callProcedure(getNextItemsToReprice, 20);
    if (itemsToReprice.length === 0) {
        return;
    }

    for (const item of itemsToReprice) {
        console.log("Repricing ", item);
        const priceBefore = await callProcedure(getListings, item);
        const { tooManySearches } = await callProcedure(checkPrice, item);
        const priceAfter = await callProcedure(getListings, item);
        console.log(
            `${priceBefore[0]?.price}, ${priceBefore[1]?.price} => ${priceAfter[0]?.price}, ${priceAfter[1]?.price}`,
        );

        if (tooManySearches) {
            return;
        }
    }
}

async function alternateBetweenPriceCheckingAndBuying(shopIds: number[]) {
    await callProcedure(undercutMarketPrices);
    await cycleThroughShopsUntilNoProfitableItems(shopIds);
    await repriceStalestItems();
}

const shopIdsSetting = getJsonSetting("shopIds", [1, 7, 14, 15]);
const isAutomatingSetting = getJsonSetting("isAutomating", false);

export function ControlPanel() {
    const [shopIds, setShopIds] = useState(shopIdsSetting.get());
    const [isAutomating, setIsAutomating] = useState(false);

    useEffect(() => {
        if (isAutomating) {
            alternateBetweenPriceCheckingAndBuying(shopIds).catch((error) => {
                console.log(error);
            });
        }
    }, [shopIds, isAutomating]);

    return (
        <div className={`bg-base-100 ${css.controlPanel}`}>
            <OnOffToggle
                checked={isAutomating}
                onChange={() => {
                    setIsAutomating(!isAutomating);
                    isAutomatingSetting.set(!isAutomating);
                }}
            />
            <SearchWizardInput
                onSearch={async (itemName: string) => {
                    await callProcedure(checkPrice, itemName);
                }}
            />
            <NpcShopInput
                value={shopIds}
                onChange={(shopIds) => {
                    setShopIds(shopIds);
                    shopIdsSetting.set(shopIds);
                }}
            />
        </div>
    );
}
