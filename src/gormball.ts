import { assume } from "@src/util/typeAssertions";
import { $ } from "@src/util/domHelpers";
import { randomPercentRange } from "@src/util/randomDelay";

function gameIsAlmostOver() {
    // 100% at the start, to 0% when there is 1 player left
    const numberOfPuddles = document.querySelectorAll(
        'img[src="//images.neopets.com/games/gormball/puddle.gif"]',
    ).length;
    const playersLeft = 8 - numberOfPuddles;
    return playersLeft <= 4;
}

function getErrorReturnToGameLink() {
    if (document.querySelector(".errorMessage a")) {
        return document.querySelector(".errorMessage a");
    }
}

function getInput(value: string): HTMLInputElement | null {
    return document.querySelector(`input[value="${value}"]`);
}

function getNextButton(): HTMLInputElement | null {
    if (getInput("Next >>>")) {
        return getInput("Next >>>");
    }
    if (getInput("Continue!")) {
        return getInput("Continue!");
    }
    if (getInput("Throw!")) {
        const twoSecondOption = assume(
            document.querySelector<HTMLOptionElement>(
                'select[name="turns_waited"] option[value="2"]',
            ),
        );
        twoSecondOption.selected = true;
        return getInput("Throw!");
    }
    return null;
}

function getStartButton() {
    if (getInput("Plaaay Ball!")) {
        assume(
            document.querySelector<HTMLOptionElement>(
                '#playerDD option[value="1"]',
            ),
        ).selected = true;
        return getInput("Plaaay Ball!");
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function advanceForward(
    aFewClicks = 5,
    aLotOfClicks = 17,
    waitBetweenRapidClicks = 98,
    waitAfterPageLoad = 912,
) {
    await sleep(randomPercentRange(waitAfterPageLoad, 0.8));

    const nextOrStartButton = getInput("Play Again") || getStartButton();
    if (nextOrStartButton) {
        nextOrStartButton.click();
        return;
    }

    if (getErrorReturnToGameLink()) {
        location.href = "/space/gormball.phtml";
        return;
    }

    const nextButton = getNextButton();
    if (nextButton) {
        const numberOfClicks = Math.round(
            randomPercentRange(gameIsAlmostOver() ? aFewClicks : aLotOfClicks),
        );
        for (let i = 0; i < numberOfClicks; i += 1) {
            await sleep(randomPercentRange(waitBetweenRapidClicks));
            nextButton.click();
        }
    }

    if (assume($("#content")).innerText.includes("SO BORED")) {
        clearInterval(retryInterval);
    }
}

advanceForward();
const retryInterval = setInterval(advanceForward, 60000);
