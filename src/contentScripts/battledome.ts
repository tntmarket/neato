import {
    $,
    waitForCondition,
    waitForElementToExist,
} from "@src/util/domHelpers";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";

async function waitForEquipmentSelectorToAppear(openSelector: string) {
    console.log("waiting for equipment popup");
    const openButton = await waitForElementToExist(openSelector);
    return waitForCondition(() => {
        openButton.click();
        const popup = assume($("#p1equipment"));
        return popup.style.display === "block";
    });
}

async function waitForAbilitySelectorToAppear(openSelector: string) {
    console.log("waiting for ability popup");
    const openButton = await waitForElementToExist(openSelector);
    return waitForCondition(() => {
        openButton.click();
        const popup = assume($("#p1ability"));
        return popup.style.display === "block";
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
    await sleep(111);
    startButton.click();

    await waitForEquipmentSelectorToAppear("#p1e1m");
    (await waitForElementToExist('[title="Varia is the Bomb"]')).click();
    await waitForElementToExist("#p1e1m.selected");

    await waitForEquipmentSelectorToAppear("#p1e2m");
    (await waitForElementToExist('[title="Cursed Elixir"]')).click();
    await waitForElementToExist("#p1e2m.selected");

    await waitForAbilitySelectorToAppear("#p1am");
    (await waitForElementToExist('[title="Lens Flare"] img')).click();
    await waitForCondition(() => {
        const selectedAbility = assume($("#p1am div")).style.backgroundImage;
        return selectedAbility?.includes("lensflare");
    });

    await normalDelay(555);

    const fightButton = await waitForElementToExist("#fight");
    await sleep(111);
    skipAsSoonAsDamageHappens();
    fightButton.click();

    const collectRewards = await waitForElementToExist("button.collect");
    await sleep(111);
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
