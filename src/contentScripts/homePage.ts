import { $ } from "@src/util/domHelpers";
import { shopWizardUrl } from "@src/urls";

const isLoggedIn = $("#npanchor");
if (isLoggedIn) {
    location.href = shopWizardUrl;
} else {
    location.href = "https://www.neopets.com/login";
}
