import { setTimeout, setInterval } from "worker-timers";

export function normalDelay(ms: number, percentageRange = 0.8) {
    return sleep(randomPercentRange(ms, percentageRange));
}

export function sleep(ms: number) {
    const start = Date.now();
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            const end = Date.now();
            const elapsed = end - start;
            if (elapsed < ms) {
                setInterval(() => {
                    if (Date.now() - start > ms) {
                        resolve();
                    }
                }, 100);
            } else {
                resolve();
            }
        }, ms);
    });
}

export function randomNormal(min: number, max: number) {
    let u = 0,
        v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) {
        num = randomNormal(min, max); // resample between 0 and 1 if out of range
    } else {
        num *= max - min; // Stretch to fill range
        num += min; // offset to min
    }
    return num;
}

export function randomPercentRange(x: number, percentRange = 0.8) {
    return randomNormal(x * (1 - percentRange), x * (1 + percentRange));
}

export function randomUniformBetween(a: number, b: number) {
    return a + (b - a) * Math.random();
}

export function randomPlusMinus(x: number, plusMinus: number) {
    return randomNormal(x - plusMinus, x + plusMinus);
}
