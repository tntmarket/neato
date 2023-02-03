import { $, $All, getInputByValue, waitReady } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { normalDelay, randomUniformBetween } from "@src/util/randomDelay";

function selectOption(selector: string, value: string) {
    assume($<HTMLSelectElement>(selector)).value = value;
}

async function trudysSurprise() {
    const iframe = assume($<HTMLIFrameElement>("#frameTest"));

    await normalDelay(2222);

    const canvas = assume(iframe.contentDocument?.querySelector("canvas"));

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

function bankInterest() {
    assume(getInputByValue("Collect Interest")).click();
}

function fruitMachine() {
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

function desertedTomb() {
    getInputByValue("Open the door...")?.click();
    getInputByValue("Continue on...")?.click();
}

function coltzansShrine() {
    getInputByValue("Approach the Shrine")?.click();
}

function appleBobbing() {
    assume($("#bob_button")).click();
}

function anchorManagement() {
    assume($("#btn-fire a")).click();
}

function tombola() {
    getInputByValue("Play Tombola!")?.click();
}

function giantJelly() {
    getInputByValue("Grab some Jelly")?.click();
}

function giantOmelette() {
    getInputByValue("Grab some Omelette")?.click();
}

function symolHole() {
    selectOption("#goin", "3");
    assume($("#enterhole")).click();
}

function discardedPlushie() {
    getInputByValue("Talk to the Plushie")?.click();
}

function underwaterFishing() {
    getInputByValue("Reel In Your Line")?.click();
}

function stockMarket() {
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

function guessTheWeightOfTheMarrow() {
    const weightInput = assume($<HTMLInputElement>('input[name="guess"]'));
    weightInput.value = Math.round(randomUniformBetween(200, 800)).toString();
    getInputByValue("Guess!")?.click();
}

function turmaculus() {
    selectOption("#wakeup", "4");
    assume($('button[type="submit"]')).click();
}

function grumpyKing() {
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

function wiseKing() {
    selectOption("#qp1", "I believe that");
    selectOption("#qp2", "charity");
    selectOption("#qp3", "is equivalent to");
    selectOption("#qp4", "the allure of");
    selectOption("#qp5", "an");
    selectOption("#qp6", "Faerie");
    selectOption("#qp7", "Alkenore");
    assume($('button[type="submit"]')).click();
}

function snowager() {
    assume($("#process_snowager button")).click();
}

function winterKiosk() {
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

function meteor() {
    const dropdown = assume($<HTMLSelectElement>('select[name="pickstep"]'));
    dropdown.value = "1";
    getInputByValue("Submit")?.click();
}

function coconutShy() {
    if (document.body.innerText.includes("No+more+throws")) {
        return;
    }
    location.reload();
}

function faerieCaverns() {
    getInputByValue("Enter")?.click();

    getInputByValue("Right")?.click();
    // getInputByValue("Left")?.click();

    getInputByValue("Click to see what you've found")?.click();
}

function forgottenShore() {
    $("#shore_back a")?.click();
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
    "/winter/snowager.phtml": snowager,
    "/winter/kiosk.phtml": winterKiosk,
    "/winter/kiosk2.phtml": winterKiosk,
    "/moon/meteor.phtml?getclose=1": meteor,
    "/halloween/process_cocoshy.phtml?coconut=3": coconutShy,
    "/faerieland/caverns/index.phtml": faerieCaverns,
    "/pirates/forgottenshore.phtml": forgottenShore,
};

Object.entries(linkToRoutine).forEach(async ([link, routine]) => {
    if (location.href.includes(link)) {
        await waitReady();
        await normalDelay(1111);
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

function academyTraining() {
    if (location.href.includes("process_academy.phtml")) {
        location.assign("/pirates/academy.phtml?type=courses");
    }
    if (location.href.includes("type=status")) {
        // getInputByValue("Pay")?.click();
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
