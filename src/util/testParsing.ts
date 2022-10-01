export function extractNumber(text: string): number {
    return parseInt(text.replace(/[^0-9]+/g, ""));
}
