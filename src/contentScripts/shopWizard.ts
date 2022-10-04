import { normalDelay, sleep } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";
import { ListingData } from "@src/database/listings";
import {
    $,
    $All,
    getInputByValue,
    waitForElementToExist,
} from "@src/util/domHelpers";
import { getSection } from "@src/shopWizardSection";
import { ensureListener } from "@src/util/scriptInjection";

ensureListener(
    (request: { action: "SEARCH_SHOP_WIZARD" } & SearchShopWizard) => {
        if (request.action === "SEARCH_SHOP_WIZARD") {
            return searchShopWizard(request);
        }
    },
);

async function newSearch(): Promise<void> {
    if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }
    // return new Promise((resolve) => {
    //     window.addEventListener("unload", () => resolve());
    //     assume(getInputByValue("New Search")).click();
    // });
}

async function askForAnotherSection(): Promise<void> {
    const waitForResults = waitForResultsToChange();
    const resubmitButton = assume(
        document.querySelector<HTMLElement>("#resubmitWizard"),
    );
    resubmitButton.click();
    await waitForResults;
}

async function waitForResultsToChange(timeout = 1111): Promise<void> {
    const shopWizardFormResults = await waitForElementToExist(
        "#shopWizardFormResults",
    );
    await Promise.race([
        new Promise<void>((resolve) => {
            const observer = new MutationObserver(async () => {
                if (
                    shopWizardFormResults.innerText.includes("Searching for:")
                ) {
                    observer.disconnect();
                    resolve();
                }
            });

            observer.observe(shopWizardFormResults, {
                attributes: true,
                childList: true,
                subtree: true,
            });
        }),
        normalDelay(timeout),
    ]);
}

async function searchItem(itemName: string): Promise<void> {
    const waitForInitialResults = waitForResultsToChange();

    const itemInput = assume(
        document.querySelector<HTMLInputElement>("#shopwizard"),
    );
    itemInput.value = itemName;

    assume(document.querySelector<HTMLElement>("#submit_wizard")).click();

    return waitForInitialResults;
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

function tooManySearches() {
    return assume($("#shopWizardFormResults")).innerText.includes(
        "too many searches",
    );
}

async function searchShopWizard({
    itemName,
    numberOfSections = 3,
    maxRequests = 5,
    abortIfCheaperThan = 1000,
}: SearchShopWizard): Promise<ShopWizardResult> {
    function sectionsFound() {
        return Object.keys(sections).length;
    }

    function getResult() {
        if (sectionsFound() === 0) {
            // The item is possibly unbuyable
            sections[0] = [
                {
                    userName: "0_NOT_A_REAL_USER!",
                    link: "0_NOT_A_REAL_LINK!",
                    quantity: 1,
                    price: 1000000,
                },
            ];
        }

        return {
            sections: Object.values(sections),
        };
    }

    let cheapestPrice = 1_000_000;
    const sections: { [section: number]: ListingData[] } = {};
    await searchItem(itemName);

    for (
        let requestNumber = 1;
        requestNumber < maxRequests;
        requestNumber += 1
    ) {
        if (tooManySearches()) {
            return {
                ...getResult(),
                tooManySearches: true,
            };
        }

        const listings = scrapeSection();

        if (listings.length > 0) {
            sections[getSection(listings[0].userName)] = listings;
            cheapestPrice = Math.min(cheapestPrice, listings[0].price);
        }

        if (sectionsFound() >= numberOfSections) {
            return getResult();
        }

        if (cheapestPrice < abortIfCheaperThan) {
            return getResult();
        }

        await normalDelay(555);

        await askForAnotherSection();
    }

    await newSearch();
    return getResult();
}

// migrateContentScriptDBToBackground();
