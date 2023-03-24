import React, { useState } from "react";
import { configurableSettings } from "@src/autoRestock/autoRestockConfig";
import { NumberSettingInput } from "@src/controlPanel/NumberSettingInput";

export type ShopIdToRefreshBudget = {
    [shopId: string]: number;
};

type Props = {
    value: ShopIdToRefreshBudget;
    onChange: (shopIdToRefreshBudget: ShopIdToRefreshBudget) => void;
};

export function NpcShopInput({ value, onChange }: Props) {
    const [showExtraSettings, setShowExtraSettings] = useState(false);
    const [shopIdToRefreshBudget, setShopIdToRefreshBudget] = useState(
        JSON.stringify(value, null, 2),
    );

    return (
        <div>
            <div className="form-control">
                <textarea
                    placeholder="{1:1, 7:1, 14:1, 15:1, 98:1, 4:1}"
                    className="textarea textarea-bordered textarea-xs textarea-primary h-28"
                    value={shopIdToRefreshBudget}
                    onChange={(event) => {
                        setShopIdToRefreshBudget(event.target.value);

                        const inputtedShopIds =
                            tryParseJson<ShopIdToRefreshBudget>(
                                event.target.value,
                            );
                        if (
                            inputtedShopIds &&
                            !isEqual(
                                tryParseJson(shopIdToRefreshBudget),
                                inputtedShopIds,
                            )
                        ) {
                            onChange(inputtedShopIds);
                        }
                    }}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label cursor-pointer">
                        <span className="label-text-alt">
                            Show Extra Settings
                        </span>
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
            </div>
            {showExtraSettings
                ? configurableSettings.map(([leftSetting, rightSetting]) =>
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

function isEqual<T>(x: T | null | undefined, y: T | null | undefined): boolean {
    return JSON.stringify(x) === JSON.stringify(y);
}

function tryParseJson<T>(x: string): T | null {
    try {
        return JSON.parse(x);
    } catch (e) {
        return null;
    }
}
