import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getListings, Listing } from "@src/database/listings";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function ListingBrowser() {
    const [itemName, setItemName] = useState("");
    const listings = useLiveQuery(
        () => getListings(itemName, 10),
        [itemName],
        [],
    );

    return (
        <>
            <div className="form-control">
                <label className="label cursor-pointer">
                    <span className="label-text">Browse Listings</span>
                    <input
                        type="text"
                        placeholder="Two Dubloon Coin"
                        className="input input-bordered input-primary w-full max-w-xs"
                        value={itemName}
                        onChange={(event) => {
                            setItemName(event.target.value);
                        }}
                    />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="table table-compact w-full">
                    <thead>
                        <tr>
                            <th>Shop Owner - {listings.length}</th>
                            <th>Stock</th>
                            <th>Price</th>
                            <th>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listings.slice(0, 10).map((listing: Listing) => (
                            <tr key={listing.userName}>
                                <th>
                                    <a className="link" href={listing.link}>
                                        {listing.userName}
                                    </a>
                                </th>
                                <td>{listing.quantity}</td>
                                <td>{listing.price}</td>
                                <td>{dayjs(listing.lastSeen).fromNow()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
