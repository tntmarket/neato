export type Setting<T> = {
    get: () => T;
    set: (x: T) => void;
    default: () => T;
    name: string;
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
        default: () => defaultValue,
        name,
        get: () => {
            const encoded = localStorage.getItem(name);
            return encoded ? decode(encoded) : defaultValue;
        },
        set: (value) => {
            localStorage.setItem(name, value.toString());
        },
    };
}

export function getJsonSetting<T>(name: string, defaultValue: T): Setting<T> {
    let cached: T | undefined = undefined;
    return {
        default: () => defaultValue,
        name,
        get: () => {
            if (cached !== undefined) {
                return cached;
            }
            const encoded = localStorage.getItem(name);
            return encoded ? JSON.parse(encoded) : defaultValue;
        },
        set: (value) => {
            localStorage.setItem(name, JSON.stringify(value));
            cached = value;
        },
    };
}
