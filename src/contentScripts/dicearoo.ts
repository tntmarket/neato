import { assume } from "@src/util/typeAssertions";
import { $ } from "@src/util/domHelpers";
import { normalDelay, randomPercentRange } from "@src/util/randomDelay";

function getInput(value: string): HTMLInputElement | null {
    return document.querySelector(`input[value="${value}"]`);
}

async function advanceForward(
    waitBetweenRapidClicks = 99,
    waitAfterPageLoad = 888,
) {
    await normalDelay(waitAfterPageLoad);
    // Only play on main account
    if (!$(".user")?.innerText?.includes("kraaab")) {
        clearInterval(retryInterval);
        return;
    }

    const startButton =
        getInput("Lets Play! (Costs 5 NP)") || getInput("Press Me");
    if (startButton) {
        startButton.click();
        return;
    }

    if (getInput("Play Dice-A-Roo")) {
        const numberOfClicks = Math.round(randomPercentRange(30));
        for (let i = 0; i < numberOfClicks; i += 1) {
            await normalDelay(waitBetweenRapidClicks);
            getInput("Play Dice-A-Roo")?.click();
        }
    }

    if (getInput("Roll Again")) {
        const numberOfClicks = Math.round(randomPercentRange(5));
        for (let i = 0; i < numberOfClicks; i += 1) {
            await normalDelay(waitBetweenRapidClicks);
            getInput("Roll Again")?.click();
        }
    }

    if (assume($("#content")).innerText.includes("SO BORED")) {
        clearInterval(retryInterval);
    }
}

advanceForward();
const retryInterval = setInterval(advanceForward, 60000);
