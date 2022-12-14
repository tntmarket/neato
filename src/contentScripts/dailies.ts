import { $, $All, getInputByValue, waitReady } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import {
    normalDelay,
    randomUniformBetween,
    sleep,
} from "@src/util/randomDelay";

function selectOption(selector: string, value: string) {
    assume($<HTMLSelectElement>(selector)).value = value;
}

async function trudysSurprise() {
    const iframe = assume($<HTMLIFrameElement>("#frameTest"));
    console.log(iframe);

    await normalDelay(2222);

    const canvas = assume(iframe.contentDocument?.querySelector("canvas"));
    console.log(canvas);

    const { top, height, left, width } = canvas.getBoundingClientRect();

    const clickX = left + width / 2;
    const clickY = top + height * (5 / 6);

    const pointer = document.createElement("div");
    pointer.style.left = `${clickX}px`;
    pointer.style.top = `${clickY}px`;
    pointer.style.position = "absolute";
    pointer.style.zIndex = "9999";
    pointer.style.width = "10px";
    pointer.style.height = "10px";
    pointer.style.background = "red";
    assume($("#trudyContainer")).append(pointer);

    await normalDelay(2222);

    canvas.dispatchEvent(
        new MouseEvent("mouseup", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: left + width / 2,
            clientY: top + height * (5 / 6),
        }),
    );
}

async function bankInterest() {
    assume(getInputByValue("Collect Interest")).click();
}

async function fruitMachine() {
    assume(getInputByValue("Spin, spin, spin!")).click();
}

async function graveDanger() {
    const againButton = $('input[name="again"]')
        ?.closest("form")
        ?.querySelector<HTMLButtonElement>("button");

    if (againButton) {
        againButton.click();
    } else {
        $All("#gdSelection button")[1].click();
        await normalDelay(1111);
        $All(".popup-grid2__2020 button")[1].click();
    }
}

async function desertedTomb() {
    getInputByValue("Open the door...")?.click();
    getInputByValue("Continue on...")?.click();
}

async function coltzansShrine() {
    getInputByValue("Approach the Shrine")?.click();
}

async function appleBobbing() {
    assume($("#bob_button")).click();
}

async function anchorManagement() {
    assume($("#btn-fire a")).click();
}

async function tombola() {
    getInputByValue("Play Tombola!")?.click();
}

async function shopOfOffers() {}

async function giantJelly() {
    getInputByValue("Grab some Jelly")?.click();
}

async function giantOmelette() {
    getInputByValue("Grab some Omelette")?.click();
}

async function symolHole() {
    selectOption("#goin", "3");
    assume($("#enterhole")).click();
}

async function discardedPlushie() {
    getInputByValue("Talk to the Plushie")?.click();
}

async function underwaterFishing() {
    getInputByValue("Reel In Your Line")?.click();
}

async function stockMarket() {
    if (location.href.includes("type=list")) {
        for (const row of $All('#content table[align="center"] tr')) {
            const price = parseInt(row.innerText.split("\t")[5]);
            const ticker = row.innerText.split("\t")[1];
            if (price === 15) {
                window.location.assign(
                    `/stockmarket.phtml?type=buy&ticker=${ticker}`,
                );
                return;
            }
        }
    }

    if (location.href.includes("type=buy")) {
        assume($<HTMLInputElement>('input[name="amount_shares"]')).value =
            "1000";
        getInputByValue("Buy Shares")?.click();
    }
}

async function guessTheWeightOfTheMarrow() {
    const weightInput = assume($<HTMLInputElement>('input[name="guess"]'));
    weightInput.value = Math.round(randomUniformBetween(200, 800)).toString();
    getInputByValue("Guess!")?.click();
}

async function turmaculus() {
    selectOption("#wakeup", "4");
    assume($('button[type="submit"]')).click();
}

async function grumpyKing() {
    selectOption("#qp1", "How");
    selectOption("#qp2", "are");
    selectOption("#qp3", "another name for");
    selectOption("#qp4", "a");
    selectOption("#qp5", "Baby");
    selectOption("#qp6", "Acara");
    selectOption("#qp7", "apart");
    selectOption("#qp8", "a bad case");
    selectOption("#qp9", "a");
    selectOption("#qp10", "2 Gallon Hatz");
    selectOption("#ap1", "A");
    selectOption("#ap2", "can't");
    selectOption("#ap3", "a");
    selectOption("#ap4", "amulet of");
    selectOption("#ap5", "Air");
    selectOption("#ap6", "00 Hog");
    selectOption("#ap7", "Acara");
    selectOption("#ap8", "Angelpi");
    assume($('button[type="submit"]')).click();
}

async function wiseKing() {
    selectOption("#qp1", "I believe that");
    selectOption("#qp2", "charity");
    selectOption("#qp3", "is equivalent to");
    selectOption("#qp4", "the allure of");
    selectOption("#qp5", "an");
    selectOption("#qp6", "Faerie");
    selectOption("#qp7", "Alkenore");
    assume($('button[type="submit"]')).click();
}

async function wheelOfKnowledge() {
    assume($("#wheelButtonSpin")).click();
}

async function winterKiosk() {
    const cardSelector = $<HTMLSelectElement>('select[name="card_id"]');
    if (cardSelector) {
        if (cardSelector.querySelector('option[value="8903"]')) {
            cardSelector.value = "8903";
            getInputByValue("Scratch!")?.click();
        }
        return;
    }

    const buyCardButton = getInputByValue("Yes, I will have one please");
    if (buyCardButton) {
        buyCardButton.click();
        return;
    }

    [1, 2, 3, 4, 5, 6].forEach((spot) => {
        const scratchSpot = $(
            `a[href="process_kiosk.phtml?type=scratch&loc=${spot}"]`,
        );
        if (scratchSpot) {
            scratchSpot.click();
        }
    });
}

async function meteor() {
    const dropdown = assume($<HTMLSelectElement>('select[name="pickstep"]'));
    dropdown.value = "1";
    getInputByValue("Submit")?.click();
}

const linkToRoutine = {
    "/trudys_surprise.phtml": trudysSurprise,
    "/bank.phtml": bankInterest,
    "/desert/fruit/index.phtml": fruitMachine,
    "/halloween/gravedanger/": graveDanger,
    "/worlds/geraptiku/tomb.phtml": desertedTomb,
    "/desert/shrine.phtml": coltzansShrine,
    "/halloween/applebobbing.phtml": appleBobbing,
    "/pirates/anchormanagement.phtml": anchorManagement,
    "/island/tombola.phtml": tombola,
    "/shop_of_offers.phtml?slorg_payout=yes": shopOfOffers,
    "/jelly/jelly.phtml": giantJelly,
    "/prehistoric/omelette.phtml": giantOmelette,
    "/medieval/symolhole.phtml": symolHole,
    "/faerieland/tdmbgpop.phtml": discardedPlushie,
    "/water/fishing.phtml": underwaterFishing,
    "/stockmarket.phtml": stockMarket,
    "/medieval/guessmarrow.phtml": guessTheWeightOfTheMarrow,
    "/medieval/turmaculus.phtml": turmaculus,
    "/medieval/grumpyking.phtml": grumpyKing,
    "/medieval/wiseking.phtml": wiseKing,
    "/medieval/knowledge.phtml": wheelOfKnowledge,
    "/winter/kiosk.phtml": winterKiosk,
    "/winter/kiosk2.phtml": winterKiosk,
    "/moon/meteor.phtml?getclose=1": meteor,
};

Object.entries(linkToRoutine).forEach(async ([link, routine]) => {
    if (location.href.includes(link)) {
        await waitReady();

        const delay = randomUniformBetween(1111, 11111);
        console.log("COMPLETE, waiting... ", Math.round(delay * 100) / 100);
        await sleep(delay);

        await routine();
    }
});

async function potatoCounter() {
    await waitReady();

    const playAgain = getInputByValue("Play Again");
    if (playAgain) {
        await normalDelay(444);
        playAgain.click();
    }

    const numberOfPotatoes = $All('#content table[align="center"] img').length;
    if (numberOfPotatoes === 0) {
        return;
    }

    await normalDelay((numberOfPotatoes / 5) * 999);

    assume($<HTMLInputElement>('input[name="guess"]')).value =
        numberOfPotatoes.toString();

    getInputByValue("Guess!")?.click();
}

if (location.href.includes("/medieval/potatocounter.phtml")) {
    potatoCounter();
}

async function wheelOfMediocrity() {
    await waitReady();
    await normalDelay(1111);
    assume($("#wheelButtonSpin")).click();
}

if (location.href.includes("/prehistoric/mediocrity.phtml")) {
    wheelOfMediocrity();
}

async function wheelOfExcitement() {
    await waitReady();
    await normalDelay(1111);
    assume($("#wheelButtonSpin")).click();
}

if (location.href.includes("/faerieland/wheel.phtml")) {
    wheelOfExcitement();
}

async function academyTraining() {
    if (location.href.includes("process_academy.phtml")) {
        location.assign("/pirates/academy.phtml?type=courses");
    }
    if (location.href.includes("type=status")) {
        getInputByValue("Pay")?.click();
        getInputByValue("Complete Course!")?.click();
    }
    if (location.href.includes("type=courses")) {
        const courseType = assume(
            $<HTMLSelectElement>('select[name="course_type"]'),
        );
        courseType.value = "Endurance";
        // getInput("Start Course")?.click();
    }
}

if (location.href.includes("academy.phtml")) {
    academyTraining();
}
