import browser from "webextension-polyfill";
import { normalDelay } from "@src/util/randomDelay";

const dailyLinks = [
    "/bank.phtml",
    "/faerieland/caverns/index.phtml",
    "/stockmarket.phtml?type=list&search=%&bargain=true",
    "/halloween/process_cocoshy.phtml?coconut=3",
    "/amfphp/json.php/WheelService.spinWheel/1", // Knowledge
    "/amfphp/json.php/WheelService.spinWheel/5", // Monotony
    "/amfphp/json.php/WheelService.spinWheel/2", // Excitement
    "/amfphp/json.php/WheelService.spinWheel/3", // Mediocrity
    "/winter/kiosk.phtml",
    "/desert/shrine.phtml",
    "/medieval/guessmarrow.phtml",
    "/faerieland/tdmbgpop.phtml",
    "/island/tombola.phtml",
    "/worlds/geraptiku/tomb.phtml",
    "/water/fishing.phtml",
    "/medieval/grumpyking.phtml",
    "/medieval/wiseking.phtml",
    "/medieval/symolhole.phtml",
    "/pirates/anchormanagement.phtml",
    "/halloween/gravedanger/",
    "/halloween/applebobbing.phtml",
    "/moon/meteor.phtml?getclose=1",
    "/winter/snowager.phtml",
    "/shop_of_offers.phtml?slorg_payout=yes",
    "/medieval/potatocounter.phtml",
    "/jelly/jelly.phtml",
    "/prehistoric/omelette.phtml",
    "/safetydeposit.phtml?obj_name=Five+Dubloon+Coin&category=3",
    "/pirates/academy.phtml?type=status",
];

export async function doDailies() {
    await browser.windows.create({
        url: "https://www.neopets.com/trudys_surprise.phtml",
    });
    await normalDelay(2222);
    await browser.windows.create({
        url: "https://www.neopets.com/desert/fruit/index.phtml",
    });
    await normalDelay(2222);
    await browser.windows.create({
        url: "https://www.neopets.com/dome/arena.phtml",
    });
    for (const path of dailyLinks) {
        await normalDelay(2222);
        await browser.tabs.create({
            url: `https://www.neopets.com${path}`,
        });
    }
}
