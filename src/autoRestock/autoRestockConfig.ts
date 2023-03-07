import { getJsonSetting } from "@src/util/localStorage";

export const MIN_VALUE_TO_SHELVE = getJsonSetting("Min Value to Shelve", 1000);

export const MIN_PROFIT_TO_BUY = getJsonSetting("Min Profit to Buy", 2500);
export const MIN_PROFIT_RATIO = getJsonSetting("Min Profit Ratio to Buy", 0.5);

export const MIN_PROFIT_TO_QUICK_BUY = getJsonSetting(
    "Min Profit to Quick Buy",
    10000,
);
export const MIN_PROFIT_RATIO_TO_QUICK_BUY = getJsonSetting(
    "Min Profit Ratio to Quick Buy",
    0.4,
);

export const ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW = 50000;

export const MAX_COPIES_TO_SHELVE = 3;
export const MAX_COPIES_TO_SHELVE_IF_VALUABLE = 5;

export const MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP = 1;
export const TIME_BETWEEN_REFRESHES = 7777;
// Wait ~3 minutes if we are restock banned
export const TIME_BETWEEN_RESTOCK_BANS = 188_888;
// Wait between restock runs
export const TIME_BETWEEN_RESTOCK_CYCLES = 11_111;

export const DAYS_BEFORE_REPRICING_SHOP_STOCK = 2;

export const TIME_TO_CHOOSE_ITEM = getJsonSetting("Time to Choose Item", 999);
export const TIME_TO_CHOOSE_ITEM_VARIANCE_RANGE = getJsonSetting(
    "Time to Choose Item +/-",
    0.5,
);

export const TIME_TO_MAKE_HAGGLE_OFFER = getJsonSetting(
    "Time to Make Haggle Offer",
    666,
);
export const TIME_TO_MAKE_HAGGLE_VARIANCE_RANGE = getJsonSetting(
    "Time to Make Haggle Offer +/-",
    0.5,
);

export const configurableSettings = [
    [MIN_PROFIT_TO_BUY, MIN_PROFIT_RATIO],
    [MIN_PROFIT_TO_QUICK_BUY, MIN_PROFIT_RATIO_TO_QUICK_BUY],
    [TIME_TO_CHOOSE_ITEM, TIME_TO_CHOOSE_ITEM_VARIANCE_RANGE],
    [TIME_TO_MAKE_HAGGLE_OFFER, TIME_TO_MAKE_HAGGLE_VARIANCE_RANGE],
    [MIN_VALUE_TO_SHELVE],
];

export const ITEMS_TO_ALWAYS_DEPOSIT = [
    "Five Dubloon Coin",
    "Spooky Treasure Map",
    "Piece of a treasure map",
    "Underwater Map Piece",
    "Secret Laboratory Map",
    "Terror Trove Scratchcard",
    "Faeries Fortune Scratchcard",
    "Eo Codestone",
    "Lu Codestone",
    "Zei Codestone",
    "Vo Codestone",
    "Mau Codestone",
    "Har Codestone",
    "Orn Codestone",
    "Tai-Kai Codestone",
    "Main Codestone",
    "Bri Codestone",
];

export const EASY_TO_SELL_REGEX = / Codestone$|Neocola Token$|Dubloon Coin$/;
