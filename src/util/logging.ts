export function l<T>(x: T): T {
    console.log(x);
    return x;
}

export function ljs<T>(x: T): T {
    console.log(JSON.stringify(x, null, 2));
    return x;
}
