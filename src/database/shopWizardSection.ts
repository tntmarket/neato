const charToSection: { [firstChar: string]: number } = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    f: 5,
    g: 6,
    h: 7,
    i: 8,
    j: 9,
    k: 10,
    l: 11,
    m: 12,
    n: 0,
    o: 1,
    p: 2,
    q: 3,
    r: 4,
    s: 5,
    t: 6,
    u: 7,
    v: 8,
    w: 9,
    x: 10,
    y: 11,
    z: 12,
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
};

const sectionToChars = [
    ["a", "n", "0"],
    ["b", "o", "1"],
    ["c", "p", "2"],
    ["d", "q", "3"],
    ["e", "r", "4"],
    ["f", "s", "5"],
    ["g", "t", "6"],
    ["h", "u", "7"],
    ["i", "v", "8"],
    ["j", "w", "9"],
    ["k", "x", "0"],
    ["l", "y"],
    ["m", "z"],
];

function getSection(userName: string): number {
    return charToSection[userName.charAt(0).toLowerCase()];
}

export function getOtherCharsInSection(userName: string): string[] {
    return sectionToChars[getSection(userName)];
}
