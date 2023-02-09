import React, { ChangeEvent } from "react";

type Props = {
    label: string;
    checked: boolean;
    onChange: (changeEvent: ChangeEvent) => void;
    className: string;
};

export function OnOffToggle({ label, checked, onChange, className }: Props) {
    return (
        <div className="form-control">
            <label className="label cursor-pointer">
                <span className="label-text">{label}</span>
                <input
                    type="checkbox"
                    className={`toggle ${className}`}
                    checked={checked}
                    onChange={onChange}
                />
            </label>
        </div>
    );
}
