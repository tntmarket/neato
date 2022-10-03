import browser from "webextension-polyfill";
import { randomPercentRange, sleep } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";
import {
    getItemsToPrice,
    popNextItemToPrice,
    pushNextItemToPrice,
} from "@src/pricingQueue";
import { ListingData } from "@src/database/listings";
import { getSetting } from "@src/util/localStorage";
import { $, $All } from "@src/util/domHelpers";
import { getSection } from "@src/shopWizardSection";

browser.runtime.onMessage.addListener(
    (request: { action: "SEARCH_SHOP_WIZARD" } & SearchShopWizard) => {
        if (request.action === "SEARCH_SHOP_WIZARD") {
            return searchShopWizard(request);
        }
    },
);

function askForAnotherSection() {
    const resubmitButton = assume(
        document.querySelector<HTMLElement>("#resubmitWizard"),
    );
    resubmitButton.click();
}

function searchItem(itemName: string) {
    const itemInput = assume(
        document.querySelector<HTMLInputElement>("#shopwizard"),
    );
    itemInput.value = itemName;
    assume(document.querySelector<HTMLElement>("#submit_wizard")).click();
}

function scrapeSection(): ListingData[] {
    return $All(
        "#shopWizardFormResults li:not(.wizard-results-grid-header)",
    ).map((row) => {
        const [userName, _, quantity, __, price] = row.innerText.split("\n");

        return {
            userName,
            quantity: parseInt(quantity),
            link: assume(row.querySelector("a")).href,
            price: parseInt(price.replaceAll(",", "")),
        };
    });
}

export type SearchShopWizard = {
    itemName: string;
    numberOfSections?: number;
    maxRequests?: number;
    abortIfCheaperThan?: number;
};

export type ShopWizardResult = {
    sections: ShopWizardSection[];
    tooManySearches?: true;
};

export type ShopWizardSection = ListingData[];

async function searchShopWizard({
    itemName,
    numberOfSections = 6,
    maxRequests = 10,
    abortIfCheaperThan = priceThreshold.get(),
}: SearchShopWizard): Promise<ShopWizardResult> {
    console.log("Checking price for ", itemName);
    let requestNumber = 0;
    let cheapestPrice = 1_000_000;
    const sections: { [section: number]: ListingData[] } = {};

    return new Promise((resolve) => {
        const observer = new MutationObserver(async () => {
            requestNumber += 1;

            if (
                assume($("#shopWizardFormResults")).innerText.includes(
                    "too many searches",
                )
            ) {
                observer.disconnect();
                resolve({
                    sections: Object.values(sections),
                    tooManySearches: true,
                });
                return;
            }

            const listings = scrapeSection();
            if (listings.length === 0) {
                return;
            }

            sections[getSection(listings[0].userName)] = listings;
            cheapestPrice = Math.min(cheapestPrice, listings[0].price);

            const sectionsFound = Object.keys(sections).length;
            console.log("Checked ", requestNumber, sectionsFound);
            if (
                requestNumber >= maxRequests ||
                sectionsFound >= numberOfSections ||
                cheapestPrice < abortIfCheaperThan
            ) {
                if (sectionsFound === 0) {
                    // The item is possibly unbuyable
                    sections[0] = [
                        {
                            userName: "NOT_A_REAL_USER!",
                            link: "NOT_A_REAL_LINK!",
                            quantity: 1,
                            price: 1000000,
                        },
                    ];
                }

                observer.disconnect();
                resolve({
                    sections: Object.values(sections),
                });
                return;
            }

            await sleep(randomPercentRange(555, 0.8));
            askForAnotherSection();
        });

        observer.observe(
            assume(document.querySelector("#shopWizardFormResults")),
            {
                attributes: true,
                childList: true,
                subtree: true,
            },
        );

        searchItem(itemName);
    });
}

const isAutoProcessingQueue = getSetting(
    "davelu.automaticallyProcessQueue",
    false,
    (value) => value === "true",
);

const priceThreshold = getSetting("abortIfUnderPrice", 1000, parseInt);

const delayBetweenRetry = getSetting("shopWizardSearchDelay", 1000, parseInt);

function refreshHUD() {
    const overlay = document.createElement("div");
    overlay.id = "neatohud";
    overlay.style.backgroundColor = "lightgray";
    overlay.style.position = "fixed";
    overlay.style.right = "30px";
    overlay.style.bottom = "30px";
    overlay.style.height = "300px";
    overlay.style.zIndex = "999999";
    overlay.style.padding = "4px";
    overlay.style.width = "250px";
    document.body.appendChild(overlay);

    const pricingQueue = document.createElement("div");
    pricingQueue.style.overflowY = "scroll";
    pricingQueue.style.height = "200px";
    pricingQueue.style.marginBottom = "4px";
    overlay.appendChild(pricingQueue);
    // arrays pop from the back. reverse to show those ones first
    getItemsToPrice()
        .reverse()
        .forEach((price) => {
            const queueItem = document.createElement("div");
            queueItem.append(price);
            pricingQueue.appendChild(queueItem);
        });

    const playPauseButton = document.createElement("button");
    const automaticallyProcessQueue = isAutoProcessingQueue.get();
    if (automaticallyProcessQueue) {
        playPauseButton.append("PAUSE");
        playPauseButton.onclick = () => {
            isAutoProcessingQueue.set(false);
            playPauseButton.innerHTML = "Pausing...";
        };
    } else {
        playPauseButton.append("PLAY");
        playPauseButton.onclick = () => {
            isAutoProcessingQueue.set(true);
            location.reload();
        };
    }
    overlay.appendChild(playPauseButton);

    const enqueueItemInput = document.createElement("input");
    enqueueItemInput.type = "text";
    enqueueItemInput.placeholder = "Paste item to queue next";
    enqueueItemInput.onkeydown = (event) => {
        // don't use Enter, because the main page detects and reacts to it
        if (event.key === "v" && event.metaKey) {
            // wait for pasted content to show up
            setTimeout(async () => {
                const itemName = enqueueItemInput.value.trim();
                pushNextItemToPrice(itemName);
                overlay.remove();
                refreshHUD();
            }, 100);
        }
    };
    overlay.appendChild(enqueueItemInput);

    const delayInput = document.createElement("input");
    delayInput.type = "text";
    delayInput.placeholder = "Delay";
    delayInput.value = delayBetweenRetry.get().toString();
    delayInput.onchange = () =>
        delayBetweenRetry.set(parseInt(delayInput.value));
    overlay.appendChild(delayInput);

    const skipButton = document.createElement("button");
    skipButton.append("SKIP");
    skipButton.onclick = () => {
        popNextItemToPrice();
        refreshHUD();
    };
    overlay.appendChild(skipButton);

    overlay.append(getItemsToPrice().length.toString());

    const thresholdInput = document.createElement("input");
    thresholdInput.type = "text";
    thresholdInput.placeholder = "MinPrice";
    thresholdInput.value = priceThreshold.get().toString();
    thresholdInput.onchange = () =>
        priceThreshold.set(parseInt(thresholdInput.value));
    overlay.appendChild(thresholdInput);
}

// refreshHUD();
// migrateContentScriptDBToBackground();
