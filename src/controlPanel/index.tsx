import * as React from "react";
import * as ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import "./app.css";
import { ControlPanel } from "@src/controlPanel/ControlPanel";

browser.tabs.query({ active: true, currentWindow: true }).then(() => {
    ReactDOM.render(<ControlPanel />, document.getElementById("controlPanel"));
});
