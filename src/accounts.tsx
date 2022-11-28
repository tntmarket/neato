import { getJsonSetting, getSetting } from "@src/util/localStorage";
import { assume } from "@src/util/typeAssertions";
import browser, { Tabs } from "webextension-polyfill";
import { waitForTabStatus } from "@src/util/tabControl";
import React, { useState } from "react";
import { CredentialsInput } from "@src/controlPanel/CredentialsInput";
import { randomPercentRange, sleep } from "@src/util/randomDelay";

export type LoginInfo = {
    username: string;
    password: string;
};

const accountIdSetting = getJsonSetting<number>("accountId", 0);

const loginInfoSetting = getJsonSetting<LoginInfo[]>("credentials", [
    { username: "bob", password: "123" },
]);

const banTimesSetting = getJsonSetting<BanTimes>("banTimes", {});

async function getLogoutTab(): Promise<Tabs.Tab> {
    const tabs = await browser.tabs.query({
        url: [
            "https://www.neopets.com/",
            "https://www.neopets.com/index.phtml",
        ],
    });
    const tab = tabs[0];
    if (tab) {
        await browser.tabs.update(tab.id, {
            url: "https://www.neopets.com/logout.phtml",
        });
        return tab;
    }

    return browser.tabs.create({ url: "https://www.neopets.com/logout.phtml" });
}

type UseAccounts = {
    loggedIntoMainAccount: boolean;
    switchAccount: (accountId: number) => Promise<void>;
    switchToUnbannedAccount: () => Promise<boolean>;
    accountsUI: React.ReactNode;
};

export type BanTimes = {
    [accountId: number]: number;
};

export function useAccounts(): UseAccounts {
    const [loggedInAccountId, setLoggedInAccountId] = useState(
        accountIdSetting.get(),
    );
    const [credentials, setCredentials] = useState(loginInfoSetting.get());
    const [banTimes, setBanTimes] = useState<BanTimes>(banTimesSetting.get());

    async function switchAccount(accountId: number) {
        const account = credentials[accountId];
        setLoggedInAccountId(accountId);
        accountIdSetting.set(accountId);
        const tab = await getLogoutTab();
        const tabId = assume(tab.id);

        await waitForTabStatus(tabId, "complete");
        await browser.tabs.update(tabId, {
            url: "https://www.neopets.com/login",
        });
        await waitForTabStatus(tabId, "complete");

        await browser.tabs.sendMessage(tabId, {
            action: "LOGIN_ACCOUNT",
            ...account,
        });
    }

    async function switchToUnbannedAccountOrMain(): Promise<boolean> {
        const justBannedAccount = credentials[loggedInAccountId];
        console.log(`${justBannedAccount.username} was just banned`);
        const nextBanTimes = { ...banTimes, [loggedInAccountId]: Date.now() };
        setBanTimes(nextBanTimes);
        banTimesSetting.set(nextBanTimes);

        const nextAccountId = getNextUnbannedAccountId(nextBanTimes);
        if (nextAccountId) {
            await switchAccount(nextAccountId);
            return true;
        }

        await waitTillNextHour();
        return false;
    }

    function getNextUnbannedAccountId(nextBanTimes: BanTimes): number | null {
        for (
            let accountId = 0;
            accountId < credentials.length;
            accountId += 1
        ) {
            if (isNotBanned(nextBanTimes, accountId)) {
                return accountId;
            }
        }
        return null;
    }

    return {
        loggedIntoMainAccount: loggedInAccountId === 0,
        switchAccount,
        switchToUnbannedAccount: switchToUnbannedAccountOrMain,
        accountsUI: (
            <CredentialsInput
                banTimes={banTimes}
                credentials={credentials}
                onChange={async (credentials: LoginInfo[]) => {
                    setCredentials(credentials);
                    loginInfoSetting.set(credentials);
                }}
                loggedInAccountId={loggedInAccountId}
                onSwitchAccount={switchAccount}
            />
        ),
    };
}

export async function waitTillNextHour(delay = 10000) {
    const millisInHour = 1000 * 60 * 60;
    const millisToNextHour = millisInHour - (Date.now() % millisInHour);
    console.log(`Waiting for ${millisToNextHour / 1000 / 60} mins`);
    return sleep(millisToNextHour + randomPercentRange(delay, 0.8));
}

export function isNotBanned(banTimes: BanTimes, accountId: number): boolean {
    const banTime = banTimes[accountId];
    const bannedMoreThanHourAgo = Date.now() - banTime > 1000 * 60 * 60;
    const bannedInDifferentHour =
        new Date(banTime).getHours() !== new Date().getHours();

    return bannedInDifferentHour || bannedMoreThanHourAgo;
}
