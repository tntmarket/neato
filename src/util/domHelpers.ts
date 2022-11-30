import { sleep } from "@src/util/randomDelay";
import { setInterval } from "worker-timers";

export function $All<E extends HTMLElement = HTMLElement>(selector: string) {
    return Array.from(document.querySelectorAll<E>(selector));
}

export function $<E extends HTMLElement = HTMLElement>(selector: string) {
    return document.querySelector<E>(selector);
}

export async function waitReady(timeout = 11111) {
    if (document.readyState === "complete") {
        return;
    }
    await Promise.race([
        new Promise((resolve) => window.addEventListener("load", resolve)),
        sleep(timeout),
    ]);
}

export async function domLoaded(timeout = 11111) {
    if (
        document.readyState === "interactive" ||
        document.readyState === "complete"
    ) {
        return;
    }
    await Promise.race([
        new Promise((resolve) =>
            window.addEventListener("DomContentLoaded", resolve),
        ),
        sleep(timeout),
    ]);
}

export function getInputByValue(value: string): HTMLInputElement | null {
    return document.querySelector(`input[value="${value}"]`);
}

export function waitForElementToExist(selector: string): Promise<HTMLElement> {
    return new Promise((resolve) => {
        setInterval(() => {
            const element = $(selector);
            if (element) {
                resolve(element);
            }
        }, 100);
    });
}
