import { getJsonSetting } from "@src/util/localStorage";

const shopLinksToVisitSetting = getJsonSetting<string[]>(
    "shopLinksToVisit",
    [],
);

export function popUserShopToVisit(): string | undefined {
    const shopLinksToVisit = shopLinksToVisitSetting.get();
    const nextShop = shopLinksToVisit.pop();
    shopLinksToVisitSetting.set(shopLinksToVisit);
    return nextShop;
}

export function queueUserShopToVisit(link: string) {
    const shopLinksToVisit = shopLinksToVisitSetting.get();
    shopLinksToVisit.push(link);
    shopLinksToVisitSetting.set(shopLinksToVisit);
}

export function tryVisitNextUserShop() {
    const nextShop = popUserShopToVisit();
    if (nextShop) {
        location.assign(nextShop);
    }
}

export function overlayUserShopsToVisit() {
    const shopLinksToVisit = shopLinksToVisitSetting.get();

    if (shopLinksToVisit.length > 0) {
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
        shopLinksToVisit.forEach((link) => {
            const linkElement = document.createElement("div");
            overlay.append(link);
            overlay.appendChild(linkElement);
        });
        document.body.appendChild(overlay);

        const clearQueueButton = document.createElement("button");
        clearQueueButton.append("Clear");
        clearQueueButton.onclick = () => {
            overlay.remove();
        };
        overlay.appendChild(clearQueueButton);
    }
}
