import React, { useState } from "react";
import { getJsonSetting } from "@src/util/localStorage";

type Props = {
    onToggle: (isEnabled: boolean) => void;
};

const automateSetting = getJsonSetting("isAutomating", false);

export function OnOffToggle({ onToggle }: Props) {
    const [isAutomating, setIsAutomating] = useState(automateSetting.get());

    return (
        <div className="form-control">
            <label className="label cursor-pointer">
                <span className="label-text">Automate</span>
                <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={isAutomating}
                    onChange={() => {
                        automateSetting.set(!isAutomating);
                        setIsAutomating(!isAutomating);
                        onToggle(!isAutomating);
                    }}
                />
            </label>
        </div>
    );
}
