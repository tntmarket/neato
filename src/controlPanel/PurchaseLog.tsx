import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfitReport } from "@src/database/purchaseLog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

const PAGE_SIZE = 50;

export function PurchaseLog() {
    const [numberOfEventsToLookBack, setNumberOfEventsToLookBack] =
        useState(100);
    const [minutesPerBucket, setMinutesPerBucket] = useState(1);
    const [purchaseLogPageNumber, setPurchaseLogPageNumber] = useState(0);

    const profitReport = useLiveQuery(
        () => getProfitReport(numberOfEventsToLookBack, minutesPerBucket),
        [numberOfEventsToLookBack, minutesPerBucket],
        {
            profitPerShop: [],
            totalProfit: 0,
            totalCost: 0,
            purchases: [],

            totalRefreshes: 0,
            profitPerRefresh: 0,
            totalStockedRefreshes: 0,
            profitPerStockedRefresh: 0,

            countsOverTime: {
                time: [],
                nothingStockedCount: [],
                nothingWorthBuyingCount: [],
                purchaseCount: [],
                soldOutCount: [],
            },
        },
    );

    const startPurchaseIdx = purchaseLogPageNumber * PAGE_SIZE;
    const endPurchaseIdx = (purchaseLogPageNumber + 1) * PAGE_SIZE;
    const pagedPurchases = profitReport.purchases.slice(
        startPurchaseIdx,
        endPurchaseIdx,
    );

    return (
        <div>
            <div className="grid grid-cols-4 gap-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text-alt">Number of Events</span>
                    </label>
                    <input
                        type="text"
                        placeholder="1000"
                        className="input input-bordered input-primary input-sm w-full"
                        value={numberOfEventsToLookBack}
                        onChange={(event) => {
                            setNumberOfEventsToLookBack(
                                parseInt(event.target.value),
                            );
                        }}
                    />
                </div>
                <div className="form-control">
                    <label className="label">
                        <span className="label-text-alt">
                            Minutes Per Bucket
                        </span>
                    </label>
                    <input
                        type="text"
                        placeholder="15"
                        className="input input-bordered input-primary input-sm w-full"
                        value={minutesPerBucket}
                        onChange={(event) => {
                            setMinutesPerBucket(parseInt(event.target.value));
                        }}
                    />
                </div>
            </div>
            <Bar
                options={{
                    animation: false,
                    responsive: true,
                    aspectRatio: 3,
                    scales: {
                        x: {
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                        },
                    },
                }}
                data={{
                    labels: profitReport.countsOverTime.time.map((millis) =>
                        dayjs(millis).format("H:mm"),
                    ),
                    datasets: [
                        {
                            label: "Shop Was Empty",
                            data: profitReport.countsOverTime
                                .nothingStockedCount,
                            backgroundColor: "rgb(248, 114, 114)",
                        },
                        {
                            label: "Nothing Worth Buying",
                            data: profitReport.countsOverTime
                                .nothingWorthBuyingCount,
                            backgroundColor: "rgb(58, 191, 248)",
                        },
                        {
                            label: "Sold Out",
                            data: profitReport.countsOverTime.soldOutCount,
                            backgroundColor: "rgb(251, 189, 35)",
                        },
                        {
                            label: "Purchased",
                            data: profitReport.countsOverTime.purchaseCount,
                            backgroundColor: "rgb(54, 211, 153)",
                        },
                    ],
                }}
            />
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
            {profitReport.purchases.length > PAGE_SIZE ? (
                <div className="btn-group">
                    <button
                        className="btn btn-xs"
                        disabled={purchaseLogPageNumber <= 0}
                        onClick={() => {
                            setPurchaseLogPageNumber((page) => page - 1);
                        }}
                    >
                        «
                    </button>
                    <button className="btn btn-xs">
                        {startPurchaseIdx} - {endPurchaseIdx} ...
                        {profitReport.purchases.length}
                    </button>
                    <button
                        className="btn btn-xs"
                        disabled={
                            endPurchaseIdx + 1 > profitReport.purchases.length
                        }
                        onClick={() => {
                            setPurchaseLogPageNumber((page) => page + 1);
                        }}
                    >
                        »
                    </button>
                </div>
            ) : null}
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Shop</th>
                        <th>Rarity</th>
                        <th>Price</th>
                        <th>Profit</th>
                        <th>Purchase Time</th>
                    </tr>
                </thead>
                <tbody>
                    {pagedPurchases.map((purchase) => (
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
