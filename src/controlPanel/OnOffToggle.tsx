import React, { ChangeEvent } from "react";

type Props = {
    label: string;
    checked: boolean;
    onChange: (changeEvent: ChangeEvent) => void;
};

export function OnOffToggle({ label, checked, onChange }: Props) {
    return (
        <div className="form-control">
            <label className="label cursor-pointer">
                <span className="label-text">{label}</span>
                <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={checked}
                    onChange={onChange}
                />
            </label>
        </div>
    );
}
