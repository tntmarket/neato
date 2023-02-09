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

    return (
        <>
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Shop Id</th>
                        <th>Profit</th>
                        <th>Profit Percent</th>
                    </tr>
                </thead>
                <tbody>
                    {profitReport.profitPerShop.map((shopReport) => (
                        <tr key={shopReport.shopId}>
                            <th>
                                {shopReport.shopId} -{" "}
                                {shopIdToName[shopReport.shopId]}
                            </th>
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
                        <th>Item</th>
                        <th>Rarity</th>
                        <th>Price ({profitReport.totalCost})</th>
                        <th>Profit ({profitReport.totalProfit})</th>
                        <th>Purchase Time</th>
                    </tr>
                </thead>
                <tbody>
                    {profitReport.purchases.slice(0, 50).map((purchase) => (
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
