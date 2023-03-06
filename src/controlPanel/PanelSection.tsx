import React from "react";

type Props = {
    children: React.ReactNode;
    name: string;
};

export function PanelSection({ children, name }: Props) {
    return (
        <div>
            <h3>{name}</h3>
            <div>{children}</div>
        </div>
    );
}
