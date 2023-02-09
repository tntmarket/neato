export const MIN_VALUE_TO_SHELVE = 1000;

export const MIN_PROFIT_TO_BUY = 2000;
export const MIN_PROFIT_RATIO = 0.5;

export const MIN_PROFIT_TO_QUICK_BUY = 10000;
export const MIN_PROFIT_RATIO_TO_QUICK_BUY = 0.4;

export const ASSUMED_PRICE_IF_JELLYNEO_DOESNT_KNOW = 50000;

export const MAX_COPIES_TO_SHELVE = 3;
export const MAX_COPIES_TO_SHELVE_IF_VALUABLE = 5;

export const MAX_DROUGHT_CYCLES_UNTIL_GIVING_UP = 1;
export const TIME_BETWEEN_REFRESHES = 7777;
// Wait ~3 minutes if we are restock banned
export const TIME_BETWEEN_RESTOCK_BANS = 188_888;
// Wait ~1 minutes between restock runs
export const TIME_BETWEEN_RESTOCK_CYCLES = 66_666;

export const DAYS_BEFORE_REPRICING_SHOP_STOCK = 2;

export const TIME_TO_CHOOSE_ITEM = 999;
export const TIME_TO_CHOOSE_ITEM_VARIANCE_RANGE = 0.5;

export const TIME_TO_MAKE_HAGGLE_OFFER = 666;
export const TIME_TO_MAKE_HAGGLE_VARIANCE_RANGE = 0.5;

export const ITEMS_TO_ALWAYS_DEPOSIT = [
    "Five Dubloon Coin",
    "Spooky Treasure Map",
    "Piece of a treasure map",
    "Underwater Map Piece",
    "Secret Laboratory Map",
    "Terror Trove Scratchcard",
];

export const EASY_TO_SELL_REGEX = / Codestone$|Neocola Token$|Dubloon Coin$/;
