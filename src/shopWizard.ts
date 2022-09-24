import { randomPercentRange, sleep } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";
import {
    getItemsToPrice,
    popNextItemToPrice,
    pushNextItemToPrice,
} from "@src/pricingQueue";
import { db, ListingData } from "@src/database/listings";

function priceFromRow(row: HTMLElement): ListingData {
    const [userName, _, quantity, __, price] = row.innerText.split("\n");

    return {
        userName,
        quantity: parseInt(quantity),
        link: assume(row.querySelector("a")).href,
        price: parseInt(price.replaceAll(",", "")),
    };
}

function checkPrice(
    itemName = "One Dubloon Coin",
    numberOfUniquePagesToCheck = 5,
    maxNumberOfRequests = 8,
    waitTime = 537,
) {
    console.log("Checking price for ", itemName);
    let requestNumber = 0;
    let uniquePages = 0;
    const prices: { [userName: string]: ListingData } = {};

    async function refreshPrices() {
        requestNumber += 1;
        console.log("Checking prices", requestNumber);
        await sleep(randomPercentRange(waitTime, 0.8));
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
        console.log("dexie entries: ", await db.getListings(itemName));

        const newPricesWereFound = Object.keys(prices).length > numberOfPrices;
        if (newPricesWereFound) {
            uniquePages += 1;
            console.log("New page of prices found", uniquePages);
        }
    }

    const observer = new MutationObserver(async () => {
        if (
            assume(
                document.querySelector<HTMLElement>("#shopWizardFormResults"),
            ).innerText.includes("too many searches")
        ) {
            const millisInHour = 1000 * 60 * 60;
            const millisToNextHour = millisInHour - (Date.now() % millisInHour);
            console.log(
                `Hit limit, resuming in ${millisToNextHour / 1000 / 60} mins`,
            );
            // Re-push, so we can retry after the ban is lifted
            pushNextItemToPrice(itemName);
            setTimeout(() => {
                location.reload();
            }, millisToNextHour + randomPercentRange(getDelay(), 0.8));
        }

        await savePrices();

        const sortedPrices = Object.values(prices).sort(
            (priceA, priceB) => priceA.price - priceB.price,
        );

        const itemIsWorthless =
            sortedPrices[0] && sortedPrices[0].price < getPriceThreshold();
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
            observer.disconnect();

            await sleep(randomPercentRange(getDelay(), 0.8));
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

function processQueueItem() {
    const itemName = popNextItemToPrice();
    if (!itemName) {
        console.log(
            "No items in the pricing queue, go back to shop here: https://www.neopets.com/market.phtml?type=your&order_by=price",
        );
        return;
    }

    checkPrice(itemName);
}

function getIsAutoProcessingQueue() {
    return (
        localStorage.getItem("davelu.automaticallyProcessQueue") === "true" ||
        false
    );
}

function setIsAutoProcessingQueue(autoProcess: boolean) {
    return localStorage.setItem(
        "davelu.automaticallyProcessQueue",
        autoProcess.toString(),
    );
}

function getPriceThreshold(): number {
    return parseInt(localStorage.getItem("abortIfUnderPrice") || "1000");
}

function setPriceThreshold(price: string) {
    return localStorage.setItem("abortIfUnderPrice", price);
}

function getDelay(): number {
    return parseInt(localStorage.getItem("shopWizardSearchDelay") || "68765");
}

function setDelay(millis: string) {
    return localStorage.setItem("shopWizardSearchDelay", millis);
}

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
    const automaticallyProcessQueue = getIsAutoProcessingQueue();
    if (automaticallyProcessQueue) {
        playPauseButton.append("PAUSE");
        playPauseButton.onclick = () => {
            setIsAutoProcessingQueue(false);
            playPauseButton.innerHTML = "Pausing...";
        };
    } else {
        playPauseButton.append("PLAY");
        playPauseButton.onclick = () => {
            setIsAutoProcessingQueue(true);
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
            setTimeout(() => {
                pushNextItemToPrice(enqueueItemInput.value);
                overlay.remove();
                refreshHUD();
            }, 100);
        }
    };
    overlay.appendChild(enqueueItemInput);

    const delayInput = document.createElement("input");
    delayInput.type = "text";
    delayInput.placeholder = "Delay";
    delayInput.value = getDelay().toString();
    delayInput.onchange = () => setDelay(delayInput.value);
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
    thresholdInput.value = getPriceThreshold().toString();
    thresholdInput.onchange = () => setPriceThreshold(thresholdInput.value);
    overlay.appendChild(thresholdInput);
}

refreshHUD();

if (getIsAutoProcessingQueue()) {
    setTimeout(processQueueItem, randomPercentRange(1234, 0.8));
}
