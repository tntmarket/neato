import { $All } from "@src/util/domHelpers";
import {
    overlayButtonToCommitItemsForPricing,
    stageItemForPricing,
} from "@src/pricingQueue";
import { db, Listing } from "@src/database/listings";

function getFulfillPlan(quantity: number, topPrices: Listing[]) {
    const unGroupedPrices = topPrices.flatMap((price) =>
        Array(price.quantity).fill(price),
    );
    const linksToOpen = new Set<string>();
    let totalCost = 0;

    for (let i = 0; i < quantity; i += 1) {
        const price = unGroupedPrices.shift();
        totalCost += price.price;
        linksToOpen.add(price.link);
    }

    return {
        totalCost,
        linksToOpen,
    };
}

const MIN_REWARD = 4000;

$All('center td[colspan="2"]').forEach(async (row) => {
    const itemName = row.innerText.split("\n")[0].split(" of:")[1].trim();
    const quantity = parseInt(
        row.innerText.split("\n")[0].split(" of:")[0].replace("Find", ""),
    );
    const reward = parseInt(
        row.innerText.split("\n")[2].split("Base Reward: ")[1].replace(",", ""),
    );

    if (reward < MIN_REWARD) {
        row.style.opacity = "0.15";
    }

    const listings = await db.getListings(itemName);
    if (listings.length > 0) {
        const fulfillPlan = getFulfillPlan(quantity, listings);

        const profitLabel = document.createElement("a");
        profitLabel.href = "javascript:void(0)";
        profitLabel.onclick = () => {
            fulfillPlan.linksToOpen.forEach((link) => window.open(link));
        };
        profitLabel.append("\u00A0\u00A0\u00A0Profit: ");
        row.appendChild(profitLabel);

        const profit = Math.floor(reward * 1.25 - fulfillPlan.totalCost);
        row.append(profit.toString());
        if (profit >= 3000) {
            row.style.background = "lightgreen";
        }

        const shops = document.createElement("div");
        shops.style.marginTop = "8px";
        listings.forEach((listing) => {
            const shop = document.createElement("a");
            shop.style.marginRight = "12px";
            shop.href = "javascript:void(0)";
            shop.text = ` ${listing.price} x ${listing.quantity} `;
            shop.onclick = () => {
                window.open(listing.link);
            };
            shops.appendChild(shop);
        });
        row.appendChild(shops);
    } else if (reward >= MIN_REWARD) {
        stageItemForPricing(itemName);
    }
});

overlayButtonToCommitItemsForPricing();
