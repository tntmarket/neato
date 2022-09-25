import { $ } from "@src/util/domHelpers";
const isLoggedIn = $("#npanchor");
if (isLoggedIn) {
    location.href = "https://www.neopets.com/shops/wizard.phtml";
} else {
    location.href = "https://www.neopets.com/login";
}
