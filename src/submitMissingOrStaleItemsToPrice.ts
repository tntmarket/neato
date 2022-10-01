import { pushItemsToPrice, pushNextItemToPrice } from "@src/pricingQueue";
import { db } from "@src/database/listings";

export function submitMissingOrStaleItemsToPrice(itemNames: string[]) {
    pushItemsToPrice([]);
    return Promise.all(
        itemNames.map(async (item) => {
            const listings = await db.getListings(item);
            if (listings.length === 0) {
                console.log("Submit ", item);
                pushNextItemToPrice(item);
                return;
            }
        }),
    );
}
