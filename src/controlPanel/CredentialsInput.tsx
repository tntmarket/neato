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
                <label className="label">
                    <span className="label-text">Credentials</span>
                </label>
                <textarea
                    className="textarea textarea-bordered textarea-primary h-24"
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
            <div>
                {credentials.map((loginInfo, accountId) => (
                    <input
                        key={accountId}
                        type="radio"
                        name="radio-2"
                        className={`radio ${
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
