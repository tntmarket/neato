import React, { useState } from "react";

type Props = {
    onSearch: (itemName: string) => void;
};

export function SearchWizardInput({ onSearch }: Props) {
    const [itemName, setItemName] = useState("");

    return (
        <div className="form-control">
            <label className="label cursor-pointer">
                <span className="label-text">Shop Wizard</span>
                <input
                    type="text"
                    placeholder="Two Dubloon Coin"
                    className="input input-bordered input-primary w-full max-w-xs"
                    value={itemName}
                    onChange={(event) => {
                        setItemName(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            setItemName("");
                            onSearch(itemName.trim());
                        }
                    }}
                />
            </label>
        </div>
    );
}
