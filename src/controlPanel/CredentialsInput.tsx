import React, { useState } from "react";
import { BanTimes, FairyQuests, isNotBanned, LoginInfo } from "@src/accounts";

type Props = {
    banTimes: BanTimes;
    fairyQuests: FairyQuests;
    credentials: LoginInfo[];
    onChange: (credentials: LoginInfo[]) => void;
    loggedInAccountId: number;
    onSwitchAccount: (accountId: number) => void;
};

export function CredentialsInput({
    banTimes,
    fairyQuests,
    credentials,
    onChange,
    loggedInAccountId,
    onSwitchAccount,
}: Props) {
    const [credentialJSON, setCredentialJSON] = useState(
        JSON.stringify(credentials),
    );

    return (
        <>
            <div className="form-control">
                <textarea
                    className="textarea textarea-bordered textarea-xs textarea-primary h-28"
                    placeholder={`[{ username: "", password: "" }]`}
                    value={credentialJSON}
                    onChange={(event) => {
                        setCredentialJSON(event.target.value);

                        const inputtedCredentials = tryParseJson<LoginInfo[]>(
                            event.target.value,
                        );
                        if (
                            inputtedCredentials &&
                            JSON.stringify(inputtedCredentials) !==
                                JSON.stringify(credentials)
                        ) {
                            onChange(inputtedCredentials);
                        }
                    }}
                />
            </div>
            <div className="mt-1">
                {credentials.map((loginInfo, accountId) => (
                    <input
                        key={accountId}
                        type="radio"
                        name="radio-2"
                        className={`radio ml-1 ${
                            fairyQuests[accountId]
                                ? "radio-warning"
                                : isNotBanned(banTimes, fairyQuests, accountId)
                                ? "radio-primary"
                                : ""
                        }`}
                        checked={accountId === loggedInAccountId}
                        onChange={() => {
                            onSwitchAccount(accountId);
                        }}
                    />
                ))}
            </div>
        </>
    );
}

function tryParseJson<T>(x: string): T | null {
    try {
        return JSON.parse(x);
    } catch (e) {
        return null;
    }
}
