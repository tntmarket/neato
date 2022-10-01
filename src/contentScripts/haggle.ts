import { $, $All } from "@src/util/domHelpers";
import { getDarkestPixel } from "@src/haggle/captcha";
import { assume } from "@src/util/typeAssertions";
import { normalDelay, sleep } from "@src/util/randomDelay";
import { db } from "@src/database/listings";

function clickCoordinate(x: number, y: number) {
    const element = assume(document.elementFromPoint(x, y));

    element.dispatchEvent(
        new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
        }),
    );
}

async function submitOffer(offer: number) {
    assume($<HTMLInputElement>('input[name="current_offer"]')).value =
        offer.toString();

    document.body.style.overflow = "hidden";
    const image = assume($<HTMLImageElement>('input[type="image"]'));

    const [{ x, y }] = await Promise.all([
        getDarkestPixel(image),
        normalDelay(444),
    ]);

    const captchaCoordinates = image.getBoundingClientRect();
    const clickX = captchaCoordinates.left + x;
    const clickY = captchaCoordinates.top + y;

    const pointer = document.createElement("div");
    pointer.style.position = "absolute";
    pointer.style.zIndex = "999999";
    pointer.style.background = "darkgreen";
    pointer.style.width = `6px`;
    pointer.style.height = `6px`;
    pointer.style.left = `${clickX + 1}px`;
    pointer.style.top = `${clickY + 1}px`;
    pointer.style.pointerEvents = "none";
    document.body.append(pointer);

    clickCoordinate(clickX, clickY);
}

function extractNumber(element: HTMLElement): number {
    return parseInt(element.innerText.replace(/[^0-9]+/g, ""));
}

function makeHumanTypable(amount: number) {
    const tail = amount % 1000;
    const head = amount - tail;
    const repeatedTail = 111 * Math.floor(tail / 111);
    return head + repeatedTail;
}

const CLOSE_ENOUGH = 100;

async function getNextOffer() {
    const itemName = assume($("h2")).innerText.split("Haggle for ")[1];
    const currentAsk = extractNumber(assume($("#shopkeeper_makes_deal")));
    const stockPrice = await db.getNpcStockPrice(itemName);

    const profit = (await db.getMarketPrice(itemName)) - stockPrice;
    const profitRatio = profit / stockPrice;
    const probablyHighlyContested = profit > 10000 && profitRatio > 0.5;
    if (probablyHighlyContested) {
        return makeHumanTypable(currentAsk);
    }

    const bestPrice = Math.round(stockPrice * 0.75);
    const lastOffer = extractNumber($All(".offer")[1]);
    const haggleRoom = currentAsk - lastOffer;
    // We've already haggled down to the best possible price
    if (currentAsk <= bestPrice) {
        return bestPrice;
    }
    // We got unlucky with discounts, there's no more room left to haggle
    if (haggleRoom <= CLOSE_ENOUGH) {
        // Settle for whatever price we currently have
        return currentAsk;
    }

    const nextOffer = Math.min(
        makeHumanTypable(lastOffer + haggleRoom / 3),
        bestPrice,
    );

    // With small prices, the rounding might put us back at the same amount
    if (nextOffer <= currentAsk) {
        return makeHumanTypable(nextOffer + 150);
    }
    return nextOffer;
}

async function makeOffer() {
    const text = assume($(".container")?.innerText);
    if (text.includes("I accept your offer") || text.includes("SOLD OUT")) {
        await sleep(5000);
        await normalDelay(555);
        assume($(".icon-back__2020")).click();
        return;
    }
    const nextOffer = await getNextOffer();
    submitOffer(nextOffer);
}

makeOffer();
