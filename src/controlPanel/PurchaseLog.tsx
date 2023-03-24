import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
    getProfitReport,
    timeStringToTimestamp,
} from "@src/database/purchaseLog";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
    TimeScale,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    TimeScale,
);

dayjs.extend(relativeTime);

const shopIdToName: {
    [shopId: number]: string;
} = {
    1: "Food",
    4: "Clothes",
    7: "Book",
    8: "Card",
    14: "Chocolate",
    15: "Baked",
    20: "Tropical Food",
    22: "Space Food",
    30: "Spooky Food",
    35: "Slushie",
    37: "Snow Food",
    48: "Usuki",
    66: "Kiko Lake Food",
    73: "Kayla's Potion",
    81: "Brightvale Fruit",
    90: "Qasalan Food",
    98: "Plushie",
};

const PAGE_SIZE = 50;

export function PurchaseLog() {
    const [startWindow, setStartWindow] = useState("-1h");
    const [endWindow, setEndWindow] = useState("now");
    const [numberOfBuckets, setNumberOfBuckets] = useState("60");
    const [purchaseLogPageNumber, setPurchaseLogPageNumber] = useState(0);

    const profitReport = useLiveQuery(
        () =>
            getProfitReport(
                startWindow,
                endWindow,
                parseInt(numberOfBuckets) || 60,
            ),
        [startWindow, endWindow, numberOfBuckets],
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
                        <span className="label-text-alt">Start Time</span>
                    </label>
                    <input
                        type="text"
                        placeholder="-2h"
                        className="input input-bordered input-primary input-sm w-full"
                        value={startWindow}
                        onChange={(event) => {
                            setStartWindow(event.target.value);
                        }}
                    />
                </div>
                <div className="form-control">
                    <label className="label">
                        <span className="label-text-alt">End Time</span>
                    </label>
                    <input
                        type="text"
                        placeholder="now"
                        className="input input-bordered input-primary input-sm w-full"
                        value={endWindow}
                        onChange={(event) => {
                            setEndWindow(event.target.value);
                        }}
                    />
                </div>
                <div className="form-control">
                    <label className="label">
                        <span className="label-text-alt">Buckets</span>
                    </label>
                    <input
                        type="text"
                        placeholder="15"
                        className="input input-bordered input-primary input-sm w-full"
                        value={numberOfBuckets}
                        onChange={(event) => {
                            setNumberOfBuckets(event.target.value);
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
                            type: "time",
                            time: {
                                displayFormats: {
                                    quarter: "H:mm",
                                },
                            },
                            adapters: {
                                date: {
                                    locale: enUS,
                                },
                            },
                            min: timeStringToTimestamp(startWindow),
                            max: timeStringToTimestamp(endWindow),
                        },
                        y: {
                            stacked: true,
                        },
                    },
                }}
                data={{
                    labels: profitReport.countsOverTime.time.map(
                        (millis) => new Date(millis),
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
