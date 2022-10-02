import React, { useEffect, useState } from "react";
import css from "./styles.module.css";
import { OnOffToggle } from "@src/controlPanel/OnOffToggle";
import { refreshUrl } from "@src/util/tabControl";

function quickStockAnyValuables() {
    return refreshUrl("https://www.neopets.com/quickstock.phtml");
}

export function ControlPanel() {
    const [isAutomating, setIsAutomating] = useState(false);

    useEffect(() => {
        quickStockAnyValuables();
    }, []);

    return (
        <div className={`bg-base-100 ${css.controlPanel}`}>
            <OnOffToggle
                onToggle={(isAutomating) => {
                    console.log(isAutomating);
                }}
            />
        </div>
    );
}
