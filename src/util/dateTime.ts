const MILLIS_IN_MINUTE = 1000 * 60;
const MILLIS_IN_HOUR = MILLIS_IN_MINUTE * 60;

export function daysAgo(epochMillis: number) {
    return hoursAgo(epochMillis) / 24;
}

export function hoursAgo(epochMillis: number) {
    const millisAgo = Date.now() - epochMillis;
    return millisAgo / MILLIS_IN_HOUR;
}
