type Setting<T> = {
    get: () => T;
    set: (x: T) => void;
};
type Serializable = {
    toString: () => string;
};

export function getSetting<T extends Serializable>(
    name: string,
    defaultValue: T,
    decode: (encoded: string) => T,
): Setting<T> {
    return {
        get: () => {
            const encoded = localStorage.getItem(name);
            return encoded ? decode(encoded) : defaultValue;
        },
        set: (value) => {
            localStorage.setItem(name, value.toString());
        },
    };
}
