import { normalDelay, randomPercentRange, sleep } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";
import {
    getItemsToPrice,
    popNextItemToPrice,
    pushItemsToPrice,
    pushNextItemToPrice,
} from "@src/pricingQueue";
import { db, ListingData } from "@src/database/listings";
import { getSetting } from "@src/util/localStorage";
import { submitMissingOrStaleItemsToPrice } from "@src/submitMissingOrStaleItemsToPrice";
import { switchToUnbannedAccount } from "@src/accounts";
import { getNextItemsToReprice } from "@src/priceMonitoring";
import { queueUserShopToVisit } from "@src/userShopQueue";
import { waitReady } from "@src/util/domHelpers";
import { ljs } from "@src/util/logging";

function priceFromRow(row: HTMLElement): ListingData {
    const [userName, _, quantity, __, price] = row.innerText.split("\n");

    return {
        userName,
        quantity: parseInt(quantity),
        link: assume(row.querySelector("a")).href,
        price: parseInt(price.replaceAll(",", "")),
    };
}

const REFRESH_DELAY = 537;

async function logListings(itemName: string) {
    ljs(await db.getListings(itemName, 5));
}

function hoursAgo(epochMillis: number) {
    return (Date.now() - epochMillis) / (1000 * 60 * 60);
}

// If user X is the cheapest, and then their section is cleared out,
// it now becomes impossible to find a listing page that would clobber
// out their original result. We can manually visit their shop to clear
// it instead
async function clearAnyInvalidListingsInFront(itemName: string) {
    const listings = await db.getListings(itemName, 6);
    for (const listing of listings) {
        // The next price is fresh, we can exit
        if (hoursAgo(listing.lastSeen) < 1) {
            return;
        }
        // It's old, we failed to find it's section. Check that it's
        // still valid, to unclog potential invalid listings
        queueUserShopToVisit(listing.link);
    }
}

function checkPrice(
    itemName = "One Dubloon Coin",
    numberOfUniquePagesToCheck = 6,
    maxNumberOfRequests = 10,
) {
    console.log("Checking price for ", itemName);
    let requestNumber = 0;
    let uniquePages = 0;
    const prices: { [userName: string]: ListingData } = {};

    async function refreshPrices() {
        requestNumber += 1;
        console.log("Checking prices", requestNumber, uniquePages);
        await sleep(randomPercentRange(REFRESH_DELAY, 0.8));
        const resubmitButton = assume(
            document.querySelector<HTMLElement>("#resubmitWizard"),
        );
        resubmitButton.click();
    }

    async function savePrices() {
        const numberOfPrices = Object.keys(prices).length;

        const listings: ListingData[] = [];
        document
            .querySelectorAll<HTMLElement>(
                "#shopWizardFormResults li:not(.wizard-results-grid-header)",
            )
            .forEach((row) => {
                const price = priceFromRow(row);
                prices[price.userName] = price;

                listings.push(price);
            });

        await db.upsertListingsSection(itemName, listings);

        const newPricesWereFound = Object.keys(prices).length > numberOfPrices;
        if (newPricesWereFound) {
            uniquePages += 1;
        }
    }

    const observer = new MutationObserver(async () => {
        if (
            assume(
                document.querySelector<HTMLElement>("#shopWizardFormResults"),
            ).innerText.includes("too many searches")
        ) {
            // Re-push, so we can retry after the ban is lifted
            pushNextItemToPrice(itemName);
            await switchToUnbannedAccount();
        }

        await savePrices();

        const sortedPrices = Object.values(prices).sort(
            (priceA, priceB) => priceA.price - priceB.price,
        );

        const itemIsWorthless =
            sortedPrices[0] && sortedPrices[0].price < priceThreshold.get();
        if (itemIsWorthless) {
            console.log(
                `${itemName} is worthless with a price of ${sortedPrices[0].price}`,
            );
        }

        if (
            requestNumber >= maxNumberOfRequests ||
            uniquePages >= numberOfUniquePagesToCheck ||
            itemIsWorthless
        ) {
            if (uniquePages === 0) {
                // The item is possibly unbuyable
                await db.upsertListingsSection(itemName, [
                    {
                        userName: "NOT_A_REAL_USER!",
                        link: "NOT_A_REAL_LINK!",
                        quantity: 1,
                        price: 1000000,
                    },
                ]);
            }

            // The item is possibly unbuyable
            await clearAnyInvalidListingsInFront(itemName);

            observer.disconnect();

            logListings(itemName);

            await sleep(randomPercentRange(delay.get(), 0.8));
            document
                .querySelectorAll<HTMLElement>(".wizard-button__2020")[1]
                .click();
            return;
        }

        await refreshPrices();
    });

    observer.observe(assume(document.querySelector("#shopWizardFormResults")), {
        attributes: true,
        childList: true,
        subtree: true,
    });

    const itemInput = assume(
        document.querySelector<HTMLInputElement>("#shopwizard"),
    );
    itemInput.value = itemName;
    assume(document.querySelector<HTMLElement>("#submit_wizard")).click();
}

async function processQueueItem() {
    await waitReady();
    await normalDelay(1234);

    const itemName = popNextItemToPrice();
    if (!itemName) {
        console.log(
            "No items in the pricing queue, calculating the best items to re-price...",
        );
        const itemsToReprice = await getNextItemsToReprice(100, 50);
        pushItemsToPrice(itemsToReprice);
        if (itemsToReprice.length === 0) {
            // Wait an hour
            await normalDelay(1000 * 60 * 60);
        }
        processQueueItem();
        return;
    }

    checkPrice(itemName);
}

const isAutoProcessingQueue = getSetting(
    "davelu.automaticallyProcessQueue",
    false,
    (value) => value === "true",
);

const priceThreshold = getSetting("abortIfUnderPrice", 1000, parseInt);

const delay = getSetting("shopWizardSearchDelay", 1000, parseInt);

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
                logListings(itemName);
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
    delayInput.value = delay.get().toString();
    delayInput.onchange = () => delay.set(parseInt(delayInput.value));
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

    const newItemsTextArea = document.createElement("textarea");
    newItemsTextArea.onchange = () => {
        const itemsToStartMonitoring = newItemsTextArea.value
            .trim()
            .split("\n");
        submitMissingOrStaleItemsToPrice(itemsToStartMonitoring);
    };
    overlay.appendChild(newItemsTextArea);
}

refreshHUD();

if (isAutoProcessingQueue.get()) {
    processQueueItem();
}
