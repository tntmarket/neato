import React, { useState } from "react";
import { getListings, Listing } from "@src/database/listings";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
    onSearch: (itemName: string) => void;
};

export function PsuedoSuperShopWizard({ onSearch }: Props) {
    const [itemName, setItemName] = useState("");
    const listings = useLiveQuery(
        () => getListings(itemName, 10),
        [itemName],
        [],
    );

    return (
        <>
            <input
                type="text"
                placeholder="Two Dubloon Coin"
                className="input input-bordered input-primary w-full"
                value={itemName}
                onChange={(event) => {
                    setItemName(event.target.value);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        onSearch(itemName.trim());
                    }
                }}
            />
            {itemName !== "" ? (
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
            ) : null}
        </>
    );
}
