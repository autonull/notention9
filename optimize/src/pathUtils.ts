export function resolvePath(obj: unknown, path: string): unknown {
    if (obj === null || obj === undefined) return undefined;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        if (typeof current === 'object' && current !== null) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return current;
}

export function getNestedValue<T>(obj: unknown, path: string): T | undefined {
    return resolvePath(obj, path) as T | undefined;
}