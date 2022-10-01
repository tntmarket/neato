export function getItemsToPrice(): string[] {
    return JSON.parse(localStorage.getItem("davelu.itemsToPrice") || "[]");
}

function setPricingStack(pricingStack: string[]) {
    localStorage.setItem("davelu.itemsToPrice", JSON.stringify(pricingStack));
}

export function pushItemsToPrice(itemNames: string[]) {
    setPricingStack([...itemNames].reverse());
}

export function pushNextItemToPrice(itemName: string) {
    itemName = itemName.trim();
    const pricingStack = getItemsToPrice();
    const existingTurnOrder = pricingStack.indexOf(itemName);
    if (existingTurnOrder >= 0) {
        pricingStack.splice(existingTurnOrder, 1);
    }
    pricingStack.push(itemName);
    setPricingStack(pricingStack);
}

export function popNextItemToPrice(): string | null {
    const pricingStack = getItemsToPrice();
    const nextItem = pricingStack.pop();
    setPricingStack(pricingStack);
    return nextItem || null;
}

const unpricedItems = new Set<string>();

export function stageItemForPricing(itemName: string) {
    unpricedItems.add(itemName);
}

export function overlayButtonToCommitItemsForPricing() {
    if (unpricedItems.size > 0) {
        const overlay = document.createElement("div");
        overlay.id = "neatohud";
        overlay.style.backgroundColor = "lightgray";
        overlay.style.position = "fixed";
        overlay.style.right = "30px";
        overlay.style.bottom = "30px";
        overlay.style.maxHeight = "300px";
        overlay.style.overflowY = "scroll";
        overlay.style.zIndex = "999999";
        overlay.style.padding = "4px";
        overlay.style.width = "250px";
        unpricedItems.forEach((itemName) => {
            const stagedItem = document.createElement("div");
            overlay.append(itemName);
            overlay.appendChild(stagedItem);
        });
        document.body.appendChild(overlay);

        const submitForPricingButton = document.createElement("button");
        submitForPricingButton.append("Submit For Pricing");
        submitForPricingButton.onclick = () => {
            unpricedItems.forEach(pushNextItemToPrice);
            unpricedItems.clear();
            overlay.remove();
        };
        overlay.appendChild(submitForPricingButton);
    }
}
