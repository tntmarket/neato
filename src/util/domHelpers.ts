import { sleep } from "@src/util/randomDelay";
import { setInterval, clearInterval } from "worker-timers";
import { assume } from "@src/util/typeAssertions";

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

export async function waitForElementToExist(
    selector: string,
    debugLogging = true,
): Promise<HTMLElement> {
    if (debugLogging) {
        console.log(`waiting for ${selector}`);
    }

    let element = $(selector);
    await waitForCondition(() => {
        element = $(selector);
        return element !== null;
    });

    if (debugLogging) {
        console.log(assume(element));
    }

    return assume(element);
}

export function waitForCondition(condition: () => boolean): Promise<void> {
    return new Promise((resolve) => {
        const elementPoller = setInterval(() => {
            if (condition()) {
                clearInterval(elementPoller);
                resolve();
            }
        }, 100);
    });
}
