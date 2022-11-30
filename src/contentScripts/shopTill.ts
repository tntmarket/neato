import { assume } from "@src/util/typeAssertions";
import { $, getInputByValue } from "@src/util/domHelpers";
import { ensureListener } from "@src/util/scriptInjection";

const tillAmount = parseInt(
    assume($(".content p b")).innerText.replace(",", ""),
);

const withdrawInput = assume($<HTMLInputElement>('input[name="amount"]'));
withdrawInput.value = tillAmount.toString();

ensureListener((request: { action: "WITHDRAW_SHOP_TILL" }) => {
    if (request.action === "WITHDRAW_SHOP_TILL") {
        if (tillAmount > 0) {
            const submitButton = assume(getInputByValue("Withdraw"));
            submitButton.click();
        }
    }
});
