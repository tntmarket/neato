export function makeHumanTypable(amount: number, preferToOverpay = false) {
    const offerStrings = humanTypableCandidates(amount);

    const candidates = offerStrings
        .map((offerString) => {
            const digits = offerString.split("");
            return {
                offer: parseInt(offerString),
                error: (parseInt(offerString) - amount) / amount,
                fingersAlternate: digits.every(
                    (char, i) => digits[i] !== digits[i + 1],
                ),
            };
        })
        .filter((candidate) => candidate.fingersAlternate)
        .filter(
            (candidate) => candidate.error > (preferToOverpay ? -0.01 : -0.05),
        )
        .sort(
            (candidateA, candidateB) =>
                Math.abs(candidateA.error) - Math.abs(candidateB.error),
        );

    if (candidates.length === 0) {
        localStorage.setItem(
            "Failed to Make Human Typeable",
            amount.toString(),
        );
        throw new Error(`Failed to Make ${amount} Human Typeable`);
    }

    return candidates[0].offer;
}

function humanTypableCandidates(amount: number): string[] {
    const stringAmount = amount.toString();
    const digit1 = stringAmount[0];
    const digit2 = stringAmount[1];
    const digit3 = stringAmount[2];

    if (amount < 1000) {
        return [
            digit1 + digit2 + digit1,
            ...(digit2 !== "0"
                ? [digit1 + decrementDigit(digit2) + digit1]
                : []),
            ...(digit2 !== "9"
                ? [digit1 + incrementDigit(digit2) + digit1]
                : []),
            digit1 + digit2 + digit3,
        ];
    }

    if (amount < 10000) {
        return [
            digit1 + digit2 + digit1 + digit2,
            ...(digit2 !== "0"
                ? [
                      digit1 +
                          decrementDigit(digit2) +
                          digit1 +
                          decrementDigit(digit2),
                      digit1 + decrementDigit(digit2) + "9" + digit1,
                  ]
                : []),
            ...(digit2 !== "9"
                ? [
                      digit1 +
                          incrementDigit(digit2) +
                          digit1 +
                          incrementDigit(digit2),
                      digit1 + incrementDigit(digit2) + "0" + digit1,
                  ]
                : []),
            digit1 + digit2 + digit3 + digit1,
            digit1 + digit2 + digit3 + digit2,
        ];
    }

    if (amount < 100000) {
        return [
            digit1 + digit2 + digit1 + digit2 + digit1,
            ...(digit2 !== "0"
                ? [
                      digit1 +
                          decrementDigit(digit2) +
                          "9" +
                          digit1 +
                          decrementDigit(digit2),
                      digit1 +
                          decrementDigit(digit2) +
                          "9" +
                          decrementDigit(digit2) +
                          digit1,
                  ]
                : []),
            ...(digit2 !== "9"
                ? [
                      digit1 +
                          incrementDigit(digit2) +
                          "0" +
                          digit1 +
                          incrementDigit(digit2),
                      digit1 +
                          incrementDigit(digit2) +
                          "0" +
                          incrementDigit(digit2) +
                          digit1,
                  ]
                : []),
            digit1 + digit2 + digit3 + digit1 + digit2,
            digit1 + digit2 + digit3 + digit2 + digit1,
        ];
    }

    return [
        digit1 + digit2 + digit3 + digit1 + digit2 + digit3,
        ...(digit2 !== "0"
            ? [
                  digit1 +
                      decrementDigit(digit2) +
                      "9" +
                      digit1 +
                      decrementDigit(digit2) +
                      "9",
                  digit1 +
                      decrementDigit(digit2) +
                      "9" +
                      decrementDigit(digit2) +
                      "9" +
                      decrementDigit(digit2),
              ]
            : []),
        ...(digit2 !== "9"
            ? [
                  digit1 +
                      incrementDigit(digit2) +
                      "0" +
                      digit1 +
                      incrementDigit(digit2) +
                      "0",
              ]
            : []),
        digit1 + digit2 + digit1 + digit2 + digit1 + digit2,
    ];
}

function incrementDigit(digit: string): string {
    return Math.min(parseInt(digit) + 1, 9).toString();
}

function decrementDigit(digit: string) {
    return Math.max(parseInt(digit) - 1, 0).toString();
}
