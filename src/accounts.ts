import { getJsonSetting, getSetting } from "@src/util/localStorage";
import { $ } from "@src/util/domHelpers";
import { assume } from "@src/util/typeAssertions";
import { randomPercentRange, sleep } from "@src/util/randomDelay";

type Credentials = {
    userName: string;
    password: string;
    lastBan: number;
};

const accounts = getJsonSetting<Credentials[]>("accountsCredentials", []);

const currentAccount = getSetting("currentAccount", 0, parseInt);

function switchAccount(accountNumber: number) {
    currentAccount.set(accountNumber);
    location.href = "https://www.neopets.com/logout.phtml";
}

export function loginCurrentUser() {
    const account = accounts.get()[currentAccount.get()];
    assume($<HTMLInputElement>("#loginUsername")).value = account.userName;
    assume($<HTMLInputElement>("#loginPassword")).value = account.password;
    assume($("#loginButton")).click();
}

export async function switchToUnbannedAccount() {
    const _accounts = accounts.get();
    const justBannedAccount = _accounts[currentAccount.get()];
    console.log(`${justBannedAccount.userName} was just banned`);
    justBannedAccount.lastBan = Date.now();
    accounts.set(_accounts);

    for (
        let accountNumber = 0;
        accountNumber < _accounts.length;
        accountNumber += 1
    ) {
        const account = _accounts[accountNumber];
        const isBanned =
            new Date(account.lastBan).getHours() === new Date().getHours();
        if (!isBanned) {
            console.log(`switching to ${account.userName}`);
            switchAccount(accountNumber);
            return;
        }
    }
    console.log("No unbanned accounts available: ", accounts.get());
    accounts.get().forEach((account, accountNumber) => {
        const loginLink = document.createElement("a");
        loginLink.append(account.userName);
        loginLink.style.display = "block";
        loginLink.href = "javascript:void(0)";
        loginLink.onclick = () => {
            switchAccount(accountNumber);
        };
        assume($(".container")).append(loginLink);
    });
    await waitTillNextHour();
    switchToUnbannedAccount();
}

export async function waitTillNextHour(delay = 10000) {
    const millisInHour = 1000 * 60 * 60;
    const millisToNextHour = millisInHour - (Date.now() % millisInHour);
    console.log(`Waiting for ${millisToNextHour / 1000 / 60} mins`);
    return sleep(millisToNextHour + randomPercentRange(delay, 0.8));
}
