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
};

export function PurchaseLog() {
    const profitReport = useLiveQuery(() => getProfitReport(500), [], {
        profitPerShop: [],
        totalProfit: 0,
        totalCost: 0,
        purchases: [],
    });

    const recentPurchases = profitReport.purchases.slice(0, 50);
    const totalRecentCost = recentPurchases
        .map((purchase) => purchase.price)
        .reduce((valueA, valueB) => valueA + valueB, 0);
    const totalRecentProfit = recentPurchases
        .map((purchase) => purchase.profit)
        .reduce((valueA, valueB) => valueA + valueB, 0);

    return (
        <>
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Shop Id</th>
                        <th>Purchases ({profitReport.purchases.length})</th>
                        <th>Cost ({profitReport.totalCost})</th>
                        <th>Profit ({profitReport.totalProfit})</th>
                        <th>Profit %</th>
                    </tr>
                </thead>
                <tbody>
                    {profitReport.profitPerShop.map((shopReport) => (
                        <tr key={shopReport.shopId}>
                            <th>
                                {shopReport.shopId} -{" "}
                                {shopIdToName[shopReport.shopId]}
                            </th>
                            <td>{shopReport.numberOfPurchases}</td>
                            <td>{shopReport.cost}</td>
                            <td>{shopReport.profit}</td>
                            <td>
                                {Math.round(shopReport.profitPercent * 100)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Item ({recentPurchases.length})</th>
                        <th>Rarity</th>
                        <th>Price ({totalRecentCost})</th>
                        <th>Profit ({totalRecentProfit})</th>
                        <th>Purchase Time</th>
                    </tr>
                </thead>
                <tbody>
                    {recentPurchases.map((purchase) => (
                        <tr key={purchase.purchaseTime}>
                            <th>{purchase.itemName}</th>
                            <td>{purchase.rarity}</td>
                            <td>{purchase.price}</td>
                            <td>{purchase.profit}</td>
                            <td>{dayjs(purchase.purchaseTime).fromNow()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
