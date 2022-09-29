export function daysAgo(epochMillis: number) {
    return Math.round((Date.now() - epochMillis) / (1000 * 60 * 60 * 24));
}