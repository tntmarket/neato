import { assume } from "@src/util/typeAssertions";
import { $ } from "@src/util/domHelpers";
import { ensureListener, waitPageUnload } from "@src/util/scriptInjection";

type LoginRequest = {
    action: "LOGIN_ACCOUNT";
    username: string;
    password: string;
};

ensureListener((request: LoginRequest) => {
    if (request.action === "LOGIN_ACCOUNT") {
        return loginUser(request);
    }
});

async function loginUser({ username, password }: LoginRequest) {
    assume($<HTMLInputElement>("#loginUsername")).value = username;
    assume($<HTMLInputElement>("#loginPassword")).value = password;
    assume($("#loginButton")).click();
    // Wait until login completes before returning
    await waitPageUnload();
}
