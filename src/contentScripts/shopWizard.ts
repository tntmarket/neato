import { normalDelay } from "@src/util/randomDelay";
import { assume } from "@src/util/typeAssertions";
import { ListingData } from "@src/database/listings";
import { $, $All, waitForElementToExist } from "@src/util/domHelpers";
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
    // Get rid of "are you sure you want to navigate away?" modal
    if (window.history.replaceState) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.history.replaceState(null, null, window.location.href);
    }
    // return new Promise((resolve) => {
    //     window.addEventListener("unload", () => resolve());
    //     assume(getInputByValue("New Search")).click();
    // });
}

async function askForAnotherSection(): Promise<void> {
    const anticipateNewResults = waitForResultsToChange();
    const resubmitButton = assume(
        document.querySelector<HTMLElement>("#resubmitWizard"),
    );
    resubmitButton.click();
    await anticipateNewResults;
}

async function waitForResultsToChange(timeout = 1111): Promise<void> {
    const shopWizardFormResults = await waitForElementToExist(
        "#shopWizardFormResults",
    );
    return new Promise<void>((resolve) => {
        const observer = new MutationObserver(async () => {
            if (shopWizardFormResults.innerText.includes("Searching for:")) {
                observer.disconnect();
                clearTimeout(abortionTimeout);
                resolve();
            }
        });

        const abortionTimeout = setTimeout(() => {
            observer.disconnect();
            resolve();
        }, timeout);

        observer.observe(shopWizardFormResults, {
            attributes: true,
            childList: true,
            subtree: true,
        });
    });
}

async function searchItem(itemName: string): Promise<void> {
    const waitForInitialResults = waitForResultsToChange(11111);

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
    numberOfSections = 4,
    maxRequests = 7,
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

    function recordScrapedListings() {
        const listings = scrapeSection();

        if (listings.length > 0) {
            sections[getSection(listings[0].userName)] = listings;
            cheapestPrice = Math.min(cheapestPrice, listings[0].price);
        }
    }

    let cheapestPrice = 1_000_000;
    const sections: { [section: number]: ListingData[] } = {};
    await searchItem(itemName);
    recordScrapedListings();

    for (
        let requestNumber = 1;
        requestNumber < maxRequests;
        requestNumber += 1
    ) {
        if (tooManySearches()) {
            return {
                // Discard the whole search, rather than risk incorrect prices, by using irrelevant sections
                sections: [],
                tooManySearches: true,
            };
        }
        const resubmitButton =
            document.querySelector<HTMLElement>("#resubmitWizard");
        if (!resubmitButton) {
            debugger;
        }

        if (sectionsFound() >= numberOfSections) {
            break;
        }

        if (cheapestPrice < abortIfCheaperThan) {
            break;
        }

        await askForAnotherSection();
        await normalDelay(444);
        recordScrapedListings();
    }

    await newSearch();
    return getResult();
}
