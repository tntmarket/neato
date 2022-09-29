import { pushNextItemToPrice, setItemsToPrice } from "@src/pricingQueue";
import { db, Listing } from "@src/database/listings";
import { daysAgo } from "@src/util/dateTime";

function expectedDaysToCrossBuyIgnoreThreshold(listings: Listing[]): number {
    const itemName = listings[0].itemName;
    const marketPrice = listings[0].price;
    if (marketPrice < 500) {
        console.log(`${itemName} is likely still junk (${marketPrice})`);
        return 14;
    }

    const priceGap = listings[1].price - listings[0].price;
    const volatilityFactor = priceGap / listings[0].price;
    if (priceGap > 500 && volatilityFactor > 0.2) {
        // A big gap between the best and 2nd-best price means the price is likely to change.
        // It can also mean we got fairly incomplete results in the previous scrape.
        console.log(`${itemName} is volatile (${listings[1].price}, ${listings[0].price})`);
        return 3;
    }

    // 2000-6000 items are restocked in high volumes, so precise pricing is crucial
    if (2000 < marketPrice && marketPrice < 6000) {
        console.log(`${itemName} is likely high volume (${marketPrice})`);
        return 3;
    }

    // Valuable stuff won't suddenly drop below the buy threshold.
    // As long as it's profitable enough, we can buy just buy it and lazily
    // find out the true price upon trying to undercut the competition.
    // We'll probably only be able to purchase a few, so the impact will be low anyways.
    if (marketPrice > 10000) {
        console.log(`${itemName} is likely still valuable (${marketPrice})`);
        return 14;
    }

    return 7;
}

export function submitMissingOrStaleItemsToPrice(itemNames: string[]) {
    setItemsToPrice([]);
    return Promise.all(
        itemNames.map(async (item) => {
            const listings = await db.getListings(item);
            if (listings.length === 0) {
                console.log("Submit ", item);
                pushNextItemToPrice(item);
                return;
            }
            if (
                daysAgo(listings[0].lastSeen) >
                expectedDaysToCrossBuyIgnoreThreshold(listings)
            ) {
                pushNextItemToPrice(item);
            }
        }),
    );
}
