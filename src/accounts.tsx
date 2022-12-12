import { getJsonSetting } from "@src/util/localStorage";
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

export type FairyQuests = {
    [accountId: number]: boolean;
};

const fairyQuestsSetting = getJsonSetting<FairyQuests>("fairyQuests", {});

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
    currentAccountCanSearch: boolean;
    switchAccount: (accountId: number) => Promise<void>;
    switchToUnbannedAccount: () => Promise<boolean>;
    recordBanTime: () => void;
    recordFairyQuest: () => void;
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
    const [fairyQuests, setFairyQuests] = useState<FairyQuests>(
        fairyQuestsSetting.get(),
    );

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
        await sleep(100);
        await waitForTabStatus(tabId, "complete");
    }

    function recordFairyQuest(): FairyQuests {
        const justBannedAccount = credentials[loggedInAccountId];
        console.log(`${justBannedAccount.username} encountered fairy quest`);
        const nextFairyQuests = { ...fairyQuests, [loggedInAccountId]: true };
        setFairyQuests(nextFairyQuests);
        fairyQuestsSetting.set(nextFairyQuests);
        return nextFairyQuests;
    }

    function recordBanTime(): BanTimes {
        const justBannedAccount = credentials[loggedInAccountId];
        console.log(`${justBannedAccount.username} was just banned`);
        const nextBanTimes = { ...banTimes, [loggedInAccountId]: Date.now() };
        setBanTimes(nextBanTimes);
        banTimesSetting.set(nextBanTimes);
        return nextBanTimes;
    }

    async function switchToUnbannedAccount(): Promise<boolean> {
        const nextAccountId = getNextUnbannedAccountId();
        if (nextAccountId !== null) {
            await switchAccount(nextAccountId);
            return true;
        }

        return false;
    }

    function getNextUnbannedAccountId(): number | null {
        for (
            let accountId = 0;
            accountId < credentials.length;
            accountId += 1
        ) {
            if (
                isNotBanned(banTimes, fairyQuests, accountId) &&
                // assume the current account is already banned,
                // but just not reflected in state yet
                accountId !== loggedInAccountId
            ) {
                return accountId;
            }
        }
        console.error("NO ACCOUNTS LEFT", banTimes, Date.now());
        return null;
    }

    return {
        loggedIntoMainAccount: loggedInAccountId === 0,
        currentAccountCanSearch: isNotBanned(
            banTimes,
            fairyQuests,
            loggedInAccountId,
        ),
        recordBanTime,
        recordFairyQuest,
        switchAccount,
        switchToUnbannedAccount,
        accountsUI: (
            <CredentialsInput
                banTimes={banTimes}
                fairyQuests={fairyQuests}
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

export function isNotBanned(
    banTimes: BanTimes,
    fairyQuests: FairyQuests,
    accountId: number,
): boolean {
    if (fairyQuests[accountId]) {
        return false;
    }
    const banTime = banTimes[accountId] || 0;
    const bannedMoreThanHourAgo = Date.now() - banTime > 1000 * 60 * 60;
    const bannedInDifferentHour =
        new Date(banTime).getHours() !== new Date().getHours();

    return bannedInDifferentHour || bannedMoreThanHourAgo;
}
