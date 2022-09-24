export function $All<E extends HTMLElement = HTMLElement>(selector: string) {
    return Array.from(document.querySelectorAll<E>(selector));
}

export function $<E extends HTMLElement = HTMLElement>(selector: string) {
    return document.querySelector<E>(selector);
}