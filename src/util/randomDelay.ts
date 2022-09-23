export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
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
