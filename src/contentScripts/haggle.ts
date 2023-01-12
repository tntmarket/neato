import { $, $All } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { getDarkestPixel } from "@src/captcha";
import { ensureListener, waitPageUnload } from "@src/util/scriptInjection";

export type HaggleDetails = {
    itemName: string;
    lastOffer: number;
    currentAsk: number;
};

export type HaggleSituation =
    | (HaggleDetails & {
          status: "HAGGLING";
      })
    | {
          status: "OUT_OF_MONEY";
      }
    | {
          status: "OUT_OF_SPACE";
      }
    | {
          status: "SOLD_OUT";
      }
    | {
          status: "OFFER_ACCEPTED";
      };

const pixelToClick = highlightPixel();

ensureListener(
    (
        request:
            | { action: "MAKE_HAGGLE_OFFER"; offer: number }
            | { action: "GET_HAGGLE_SITUATION" },
    ) => {
        if (request.action === "MAKE_HAGGLE_OFFER") {
            return makeHaggleOffer(request.offer);
        }
        if (request.action === "GET_HAGGLE_SITUATION") {
            return getHaggleSituation();
        }
    },
);

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

async function highlightPixel(): Promise<{ x: number; y: number }> {
    const situation = await getHaggleSituation();
    if (situation.status !== "HAGGLING") {
        return { x: 0, y: 0 };
    }

    document.body.style.overflow = "hidden";
    const image = assume($<HTMLImageElement>('input[type="image"]'));

    const { x, y } = await getDarkestPixel(image);

    const captchaCoordinates = image.getBoundingClientRect();
    const clickX = captchaCoordinates.left + x + 3;
    const clickY = captchaCoordinates.top + y + 3;

    const pointer = document.createElement("div");
    pointer.style.position = "absolute";
    pointer.style.zIndex = "999999";
    pointer.style.background = "coral";
    pointer.style.width = `6px`;
    pointer.style.height = `6px`;
    pointer.style.left = `${clickX + 1}px`;
    pointer.style.top = `${clickY + 1}px`;
    pointer.style.pointerEvents = "none";
    document.body.append(pointer);

    return { x: clickX, y: clickY };
}

async function makeHaggleOffer(offer: number) {
    assume($<HTMLInputElement>('input[name="current_offer"]')).value =
        offer.toString();

    const { x, y } = await pixelToClick;
    clickCoordinate(x, y);

    // Wait until page reloads before returning,
    // so we don't haggle twice on the same page
    await waitPageUnload();
}

function extractNumber(element: HTMLElement): number {
    return parseInt(element.innerText.replace(/[^0-9]+/g, ""));
}

async function getHaggleSituation(): Promise<HaggleSituation> {
    const text = assume($(".container")?.innerText);
    if (text.includes("I accept your offer")) {
        return {
            status: "OFFER_ACCEPTED",
        };
    }
    if (text.includes("SOLD OUT")) {
        return {
            status: "SOLD_OUT",
        };
    }
    if (text.includes("don't have that kind of money")) {
        return {
            status: "OUT_OF_MONEY",
        };
    }
    if (text.includes("you can only carry a maximum")) {
        return {
            status: "OUT_OF_SPACE",
        };
    }

    const itemName = assume($("h2")).innerText.split("Haggle for ")[1];
    const currentAsk = extractNumber(assume($("#shopkeeper_makes_deal")));
    const lastOffer = extractNumber($All(".offer")[1]);

    return {
        status: "HAGGLING",
        itemName,
        currentAsk,
        lastOffer,
    };
}
