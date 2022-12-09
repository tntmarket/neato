import { $, waitForElementToExist } from "@src/util/domHelpers";
import { normalDelay } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";

function waitForEquipmentSelectorToAppear() {
    // Wait for equipment selector to appear
    return new Promise<void>((resolve) => {
        const observer = new MutationObserver(async () => {
            if (equipmentPopup.style.display === "block") {
                observer.disconnect();
                resolve();
            }
        });

        const equipmentPopup = assume($("#p1equipment"));
        observer.observe(equipmentPopup, {
            attributes: true,
            childList: true,
            subtree: true,
        });
    });
}

function skipAsSoonAsDamageHappens() {
    let disappeared = false;
    const observer = new MutationObserver(async () => {
        if (skipReplay.style.display === "none") {
            // The skip button needs to flicker before
            // it applies to the current turn
            disappeared = true;
        }
        if (skipReplay.style.display === "block" && disappeared) {
            observer.disconnect();
            skipReplay.click();
        }
    });

    const skipReplay = assume($("#skipreplay"));
    observer.observe(skipReplay, {
        attributes: true,
        childList: true,
        subtree: true,
    });
}

async function completeBattle() {
    console.log("go");
    // Only play on main account
    if (!$(".user")?.innerText?.includes("kraaab")) {
        return;
    }

    const startButton = await waitForElementToExist("#start");
    await normalDelay(555);
    startButton.click();

    // const mainHandSelector = assume($("#p1e1m"));
    // mainHandSelector.click();

    const offHandSelector = await waitForElementToExist("#p1e2m");
    const waitEquipmentSelector = waitForEquipmentSelectorToAppear();
    await normalDelay(555);
    offHandSelector.click();
    await waitEquipmentSelector;

    const cursedElixir = await waitForElementToExist('[title="Cursed Elixir"]');
    cursedElixir.click();
    await waitForElementToExist("#p1e2m.selected");

    // const abilitySelector = assume($("#p1am"));
    // abilitySelector.click();

    const fightButton = await waitForElementToExist("#fight");
    await normalDelay(555);
    skipAsSoonAsDamageHappens();
    fightButton.click();

    const collectRewards = await waitForElementToExist("button.collect");
    await normalDelay(555);
    collectRewards.click();

    const rewardText = (await waitForElementToExist("#bd_rewards")).innerText;
    if (
        rewardText.includes("You have reached the NP limit") &&
        rewardText.includes("You have reached the item limit")
    ) {
        console.log("No rewards left");
        return;
    }

    const playAgain = await waitForElementToExist("#bdplayagain");
    await normalDelay(2222);
    playAgain.click();
}

completeBattle();
