import React, { useState } from "react";

type Props = {
    value: number[];
    onChange: (shopIds: number[]) => void;
};

export function NpcShopInput({ value, onChange }: Props) {
    const [shopIds, setShopIds] = useState(JSON.stringify(value));

    return (
        <div className="form-control">
            <label className="label">
                <span className="label-text-alt">NPC Shops to Monitor</span>
            </label>
            <input
                type="text"
                placeholder="[1,7]"
                className="input input-bordered input-primary w-full"
                value={shopIds}
                onChange={(event) => {
                    setShopIds(event.target.value);

                    const inputtedShopIds = tryParseJson<number[]>(
                        event.target.value,
                    );
                    if (
                        inputtedShopIds &&
                        !isEqual(tryParseJson(shopIds), inputtedShopIds)
                    ) {
                        onChange(inputtedShopIds);
                    }
                }}
            />
        </div>
    );
}

function isEqual<T>(
    xs: T[] | null | undefined,
    ys: T[] | null | undefined,
): boolean {
    if (xs === ys) {
        return true;
    }
    if (xs == null || ys == null) {
        return false;
    }
    if (xs.length !== ys.length) {
        return false;
    }
    for (let i = 0; i < xs.length; i += 1) {
        if (xs[i] !== ys[i]) {
            return false;
        }
    }
    return true;
}

function tryParseJson<T>(x: string): T | null {
    try {
        return JSON.parse(x);
    } catch (e) {
        return null;
    }
}
