import { $, $All, domLoaded } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { normalDelay } from "@src/util/randomDelay";

function injectScript(filePath: string) {
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("type", "text/javascript");
    scriptTag.src = filePath;
    document.body.appendChild(scriptTag);

    return new Promise((resolve) => {
        scriptTag.onload = resolve;
    });
}

async function makeFoodClubBets() {
    await domLoaded();
    await injectScript(chrome.runtime.getURL("js/foodClubScript.js"));
    assume($("#maxter")).click();

    const betButton = document.createElement("button");
    betButton.innerText = "Make All Bets";
    betButton.style.position = "fixed";
    betButton.style.right = "30px";
    betButton.style.bottom = "30px";
    betButton.onclick = async () => {
        for (const betButton of $All<HTMLInputElement>(
            'input[value="Place this bet!"]',
        )) {
            await normalDelay(1111);
            betButton.dispatchEvent(new MouseEvent("click"));
        }
    };
    document.body.appendChild(betButton);
}

makeFoodClubBets();
