import { Setting } from "@src/util/localStorage";
import React, { useState } from "react";

type SettingInputProps<T> = {
    setting: Setting<T>;
};

export function NumberSettingInput({ setting }: SettingInputProps<number>) {
    const [value, setValue] = useState(setting.get().toString());

    return (
        <div className="form-control">
            <label className="label">
                <span className="label-text-alt">{setting.name}</span>
            </label>
            <input
                type="text"
                placeholder={setting.default().toString()}
                className="input input-bordered input-primary input-sm w-full"
                value={value}
                onChange={(event) => {
                    setValue(event.target.value);
                    const _value = parseFloat(event.target.value);
                    setting.set(_value);
                }}
                onBlur={() => {
                    const _value = parseFloat(value);
                    setValue(_value.toString());
                    setting.set(_value);
                }}
            />
        </div>
    );
}
