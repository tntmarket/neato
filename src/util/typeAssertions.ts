export function assume<T>(
    x: T | null,
    errorMessage = "Unexpected null value",
): T {
    if (!x) {
        throw new Error(errorMessage);
    }
    return x;
}