import { $ } from "@src/util/domHelpers";
import { getDarkestPixel } from "@src/haggle/captcha";
import { assume } from "@src/util/typeAssertions";
import { normalDelay } from "@src/util/randomDelay";

function clickCoordinate(x: number, y: number) {
    const element = assume(document.elementFromPoint(x, y));

    console.log(x, y, element);
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

async function annotateDarkestPixel() {
    document.body.style.overflow = "hidden";
    const image = assume($<HTMLImageElement>('input[type="image"]'));

    const [{ x, y }] = await Promise.all([
        getDarkestPixel(image),
        normalDelay(987),
    ]);

    const captchaCoordinates = image.getBoundingClientRect();
    const clickX = captchaCoordinates.left + x;
    const clickY = captchaCoordinates.top + y;

    const pointer = document.createElement("div");
    pointer.style.position = "absolute";
    pointer.style.zIndex = "999999";
    pointer.style.background = "red";
    pointer.style.width = `4px`;
    pointer.style.height = `4px`;
    pointer.style.left = `${clickX + 1}px`;
    pointer.style.top = `${clickY + 1}px`;
    pointer.style.pointerEvents = "none";
    document.body.append(pointer);

    // TODO actually put correct offer
    // - remember inventory price from npcShop
    // - offer = currentOffer + (ask - currentOffer)/3
    assume($<HTMLInputElement>('input[name="current_offer"]')).onchange =
        () => {
            clickCoordinate(clickX, clickY);
        };
}

annotateDarkestPixel();
