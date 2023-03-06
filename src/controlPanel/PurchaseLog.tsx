import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfitReport } from "@src/database/purchaseLog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const shopIdToName: {
    [shopId: number]: string;
} = {
    1: "Food",
    7: "Book",
    14: "Chocolate",
    15: "Baked",
    98: "Plushie",
    4: "Clothes",
    37: "Snow Food",
    73: "Kayla's Potion",
    8: "Card",
    48: "Usuki",
    20: "Tropical Food",
    30: "Spooky Food",
    35: "Slushie",
    81: "Brightvale Fruit",
};

export function PurchaseLog() {
    const profitReport = useLiveQuery(() => getProfitReport(1000), [], {
        profitPerShop: [],
        totalProfit: 0,
        totalCost: 0,
        purchases: [],

        totalRefreshes: 0,
        profitPerRefresh: 0,
        totalStockedRefreshes: 0,
        profitPerStockedRefresh: 0,
    });

    const recentPurchases = profitReport.purchases.slice(0, 50);
    const totalRecentCost = recentPurchases
        .map((purchase) => purchase.price)
        .reduce((valueA, valueB) => valueA + valueB, 0);
    const totalRecentProfit = recentPurchases
        .map((purchase) => purchase.profit)
        .reduce((valueA, valueB) => valueA + valueB, 0);

    return (
        <div className="overflow-x-auto">
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Shop Id</th>
                        <th>Cost ({profitReport.totalCost})</th>
                        <th>Profit ({profitReport.totalProfit})</th>
                        <th>Profit %</th>
                        <th>
                            Per Refresh (
                            {Math.round(profitReport.profitPerRefresh)})
                        </th>
                        <th>
                            Per Scan (
                            {Math.round(profitReport.profitPerStockedRefresh)})
                        </th>
                        <th>Refreshes ({profitReport.totalRefreshes})</th>
                        <th>Scans ({profitReport.totalStockedRefreshes})</th>
                        <th>Buys ({profitReport.purchases.length})</th>
                        <th>Sellouts</th>
                    </tr>
                </thead>
                <tbody>
                    {profitReport.profitPerShop.map((shopReport) => (
                        <tr key={shopReport.shopId}>
                            <th>
                                {shopReport.shopId} -{" "}
                                {shopIdToName[shopReport.shopId]}
                            </th>
                            <td>{shopReport.cost}</td>
                            <td>{shopReport.profit}</td>
                            <td>
                                {Math.round(shopReport.profitPercent * 100)}%
                            </td>
                            <td>{Math.round(shopReport.profitPerRefresh)}</td>
                            <td>
                                {Math.round(shopReport.profitPerStockedRefresh)}
                            </td>
                            <td>{shopReport.totalRefreshes}</td>
                            <td>{shopReport.totalStockedRefreshes}</td>
                            <td>{shopReport.purchaseCount}</td>
                            <td>{shopReport.soldOutCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Item ({recentPurchases.length})</th>
                        <th>Shop</th>
                        <th>Rarity</th>
                        <th>Price ({totalRecentCost})</th>
                        <th>Profit ({totalRecentProfit})</th>
                        <th>Purchase Time</th>
                    </tr>
                </thead>
                <tbody>
                    {recentPurchases.map((purchase) => (
                        <tr key={purchase.time}>
                            <th>{purchase.itemName}</th>
                            <td>{shopIdToName[purchase.shopId]}</td>
                            <td>{purchase.rarity}</td>
                            <td>{purchase.price}</td>
                            <td>{purchase.profit}</td>
                            <td>{dayjs(purchase.time).fromNow()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
