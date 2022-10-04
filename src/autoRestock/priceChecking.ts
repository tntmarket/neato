import {
    clearListing,
    getListings,
    updateListing,
    upsertListingsSection,
} from "@src/database/listings";
import { hoursAgo } from "@src/util/dateTime";
import { checkUserShopListing } from "@src/contentScriptActions/checkUserShopListing";
import { trackUserWasFrozen } from "@src/database/user";
import { assume } from "@src/util/typeAssertions";
import { searchShopWizard } from "@src/contentScriptActions/searchShopWizard";
import { ljs } from "@src/util/logging";

export async function checkPrice(
    itemName: string,
): Promise<{ tooManySearches?: true }> {
    const { sections, tooManySearches } = await searchShopWizard({
        itemName,
        numberOfSections: 5,
        maxRequests: 8,
        abortIfCheaperThan: 1000,
    });

    for (const listings of sections) {
        await upsertListingsSection(itemName, listings);
    }

    ljs(await getListings(itemName, 3));

    await clearAnyInvalidListingsInFront(itemName);

    return { tooManySearches };
}

// If user X is the cheapest, and then their section is cleared out,
// it now becomes impossible to find a listing page that would clobber
// out their original result. We can manually visit their shop to clear
// it instead
async function clearAnyInvalidListingsInFront(itemName: string) {
    const listings = await getListings(itemName, 2);
    for (const listing of listings) {
        // The next price is fresh, we can exit
        if (hoursAgo(listing.lastSeen) < 1) {
            return;
        }

        // It's old, we failed to find it's section. Check that it's
        // still valid, to unclog potential invalid listings
        await updateListingFromVisit(listing.link);
    }
}

async function updateListingFromVisit(link: string) {
    const result = await checkUserShopListing(link);
    if (result.notFound) {
        await clearListing(link);
        return;
    }
    if (result.frozenUser) {
        await trackUserWasFrozen(result.frozenUser);
        return;
    }
    const listing = assume(result.listing);
    await updateListing(listing.link, listing.quantity, listing.price);
}
