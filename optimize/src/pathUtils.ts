export function resolvePath(obj: unknown, path: string): unknown {
    if (obj === null || obj === undefined) return undefined;
    return path.split('.').reduce((acc: unknown, part) => {
        if (acc === null || acc === undefined) return undefined;
        const match = part.match(/^(.+)\[(\d+)\]$/);
        if (match) {
            const objAcc = acc as Record<string, unknown>;
            const arr = objAcc[match[1]] as unknown[] | undefined;
            return arr?.[parseInt(match[2], 10)];
        }
        return (acc as Record<string, unknown>)[part];
    }, obj);
}

export function getNestedValue<T>(obj: unknown, path: string): T | undefined {
    return resolvePath(obj, path) as T | undefined;
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => deepEqual(val, b[i]));
    }
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}