import { getListings, upsertListingsSection } from "@src/database/listings";
import { hoursAgo } from "@src/util/dateTime";
import { searchShopWizard } from "@src/contentScriptActions/searchShopWizard";
import browser, { Tabs } from "webextension-polyfill";
import { assume } from "@src/util/typeAssertions";
import { waitForTabStatus } from "@src/util/tabControl";
import { sleep } from "@src/util/randomDelay";
import {
    MIN_PROFIT_TO_BUY_JUNK,
    MIN_VALUE_TO_SHELVE,
} from "@src/autoRestock/autoRestockConfig";
import { getCurrentShopStock } from "@src/database/myShopStock";

export type PriceCheckOutcome = { tooManySearches?: true; onFairyQuest?: true };

export async function checkPrice(
    itemName: string,
    abortIfCheaperThan = MIN_PROFIT_TO_BUY_JUNK.get(),
): Promise<PriceCheckOutcome> {
    const numberOwned = await getCurrentShopStock(itemName);
    const { sections, tooManySearches, onFairyQuest } = await searchShopWizard(
        numberOwned > 0
            ? {
                  itemName,
                  numberOfSections: 6,
                  maxRequests: 9,
                  // If we are currently selling an item, do a very accurate check, to make sure we're the cheapest
                  abortIfCheaperThan: MIN_VALUE_TO_SHELVE.get(),
              }
            : {
                  itemName,
                  numberOfSections: 5,
                  maxRequests: 7,
                  // If we're just checking to prepare for restocking,
                  // abort as soon as we know it's cheap enough to ignore
                  abortIfCheaperThan,
              },
    );

    if (tooManySearches) {
        return { tooManySearches: true };
    }

    if (onFairyQuest) {
        return { onFairyQuest: true };
    }

    for (const listings of sections) {
        await upsertListingsSection(itemName, listings);
    }

    // ljs(await getListings(itemName, 3));

    await clearAnyInvalidListingsInFront(itemName);

    return {};
}

// If user X is the cheapest, and then their section is cleared out,
// it now becomes impossible to find a listing page that would clobber
// out their original result. We can manually visit their shop to clear
// it instead
async function clearAnyInvalidListingsInFront(itemName: string) {
    const listings = await getListings(itemName, 100);
    for (const listing of listings) {
        // The next price is fresh, we can exit
        if (hoursAgo(listing.lastSeen) < 1) {
            return;
        }

        // It's old, and we failed to replace it's section.
        // Check that it's still valid, to unclog stale listings
        const tab = await checkUserShopListing(listing.link);
        const tabId = assume(tab.id);

        await waitForTabStatus(tabId, "complete");
        await sleep(300);

        await browser.tabs.sendMessage(tabId, {
            action: "CHECK_USER_SHOP_ITEM",
        });
    }
}

async function checkUserShopListing(link: string): Promise<Tabs.Tab> {
    const userShopTabs = await browser.tabs.query({
        url: "https://www.neopets.com/browseshop.phtml*",
    });
    const tab = userShopTabs[0];
    if (tab) {
        return browser.tabs.update(tab.id, {
            url: `${link}&buy_obj_confirm=yes`,
        });
    }
    return browser.tabs.create({ url: link });
}
