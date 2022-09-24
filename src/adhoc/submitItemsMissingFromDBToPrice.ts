import { pushNextItemToPrice, setItemsToPrice } from "@src/pricingQueue";
import { db } from "@src/database/listings";

export function submitItemsMissingFromDBToPrice(itemNames: string[]) {
    setItemsToPrice([]);
    return Promise.all(
        itemNames.map(async (item) => {
            const listings = await db.getListings(item);
            if (listings.length === 0) {
                console.log("Submitting ", item);
                pushNextItemToPrice(item);
            }
        }),
    );
}
