import React, { useState } from "react";
import {
    extraConfigurableSettings,
    MIN_PROFIT_RATIO,
    MIN_PROFIT_TO_BUY,
} from "@src/autoRestock/autoRestockConfig";
import { NumberSettingInput } from "@src/controlPanel/NumberSettingInput";
import { PanelSection } from "@src/controlPanel/PanelSection";

type Props = {
    value: number[];
    onChange: (shopIds: number[]) => void;
};

export function NpcShopInput({ value, onChange }: Props) {
    const [showExtraSettings, setShowExtraSettings] = useState(false);
    const [shopIds, setShopIds] = useState(JSON.stringify(value));

    return (
        <div>
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
            <div className="grid grid-cols-2 gap-4">
                <NumberSettingInput setting={MIN_PROFIT_TO_BUY} />
                <NumberSettingInput setting={MIN_PROFIT_RATIO} />
            </div>
            <div className="form-control">
                <label className="label cursor-pointer">
                    <span className="label-text">Show Extra Settings</span>
                    <input
                        type="checkbox"
                        checked={showExtraSettings}
                        className="checkbox checkbox-xs checkbox-primary"
                        onChange={() => {
                            setShowExtraSettings(!showExtraSettings);
                        }}
                    />
                </label>
            </div>
            {showExtraSettings
                ? extraConfigurableSettings.map(([leftSetting, rightSetting]) =>
                      rightSetting ? (
                          <div
                              className="grid grid-cols-2 gap-4"
                              key={leftSetting.name}
                          >
                              <NumberSettingInput setting={leftSetting} />

                              <NumberSettingInput setting={rightSetting} />
                          </div>
                      ) : (
                          <NumberSettingInput
                              setting={leftSetting}
                              key={leftSetting.name}
                          />
                      ),
                  )
                : null}
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
