import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getAllStockedItems } from "@src/database/myShopStock";
import { getCachedRarity } from "@src/database/jellyNeo";

export function MyShopStockBrowser() {
    const [itemName, setItemName] = useState("?");
    const stockedItems = useLiveQuery(() => getAllStockedItems(), [], []);

    const totalQuantity = stockedItems
        .map((item) => item.quantity)
        .reduce((valueA, valueB) => valueA + valueB, 0);
    const totalValue = stockedItems
        .map((item) => item.quantity * item.price)
        .reduce((valueA, valueB) => valueA + valueB, 0);

    return (
        <>
            <div className="form-control">
                <label className="label cursor-pointer">
                    <span className="label-text">Browse My Shop Inventory</span>
                    <input
                        type="text"
                        placeholder="Two Dubloon Coin"
                        className="input input-bordered input-primary w-full max-w-xs"
                        value={itemName}
                        onChange={(event) => {
                            setItemName(event.target.value.trim());
                        }}
                    />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-compact w-full">
                    <thead>
                        <tr>
                            <th>Item ({stockedItems.length})</th>
                            <th>Rarity</th>
                            <th>Quantity ({totalQuantity})</th>
                            <th>Price ({totalValue})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stockedItems
                            .sort((a, b) => a.price - b.price)
                            .filter(
                                (item) =>
                                    itemName === "" ||
                                    item.itemName.includes(itemName),
                            )
                            .map((listing) => (
                                <tr key={listing.itemName}>
                                    <th>{listing.itemName}</th>
                                    <td>{getCachedRarity(listing.itemName)}</td>
                                    <td>{listing.quantity}</td>
                                    <td>{listing.price}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
