export function objectMap<V, T>(
    obj: Record<string, V>,
    fn: (value: V, key: string, index: number) => T,
): Record<string, T> {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]),
    );
}
