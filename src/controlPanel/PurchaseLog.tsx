import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getPurchaseLog } from "@src/database/purchaseLog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getMarketPrice } from "@src/database/listings";
import { underCut } from "@src/autoRestock/buyingItems";

dayjs.extend(relativeTime);

export function PurchaseLog() {
    const purchasesWithProfit = useLiveQuery(
        async () => {
            const purchases = await getPurchaseLog(50);
            return Promise.all(
                purchases.map(async (purchase) => {
                    const marketPrice = await getMarketPrice(purchase.itemName);
                    return {
                        ...purchase,
                        profit:
                            marketPrice > 0
                                ? underCut(marketPrice) - purchase.price
                                : 0,
                    };
                }),
            );
        },
        [],
        [],
    );
    const totalCost = purchasesWithProfit
        .map((purchase) => purchase.price)
        .reduce((valueA, valueB) => valueA + valueB, 0);
    const totalProfit = purchasesWithProfit
        .map((purchase) => purchase.profit)
        .reduce((valueA, valueB) => valueA + valueB, 0);

    return (
        <div className="overflow-x-auto">
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Item ({purchasesWithProfit.length})</th>
                        <th>Price ({totalCost})</th>
                        <th>Profit ({totalProfit})</th>
                        <th>Purchase Time</th>
                    </tr>
                </thead>
                <tbody>
                    {purchasesWithProfit.map((purchase) => (
                        <tr key={purchase.purchaseTime}>
                            <th>{purchase.itemName}</th>
                            <td>{purchase.price}</td>
                            <td>{purchase.profit}</td>
                            <td>{dayjs(purchase.purchaseTime).fromNow()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
