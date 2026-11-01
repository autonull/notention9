/**
 * Singleton utility - reduces boilerplate for singleton classes
 */

export function createSingleton<T>(factory: () => T): { getInstance: () => T; resetInstance: () => void } {
    let instance: T | null = null;

    return {
        getInstance(): T {
            if (!instance) {
                instance = factory();
            }
            return instance;
        },
        resetInstance(): void {
            instance = null;
        },
    };
}

export function createAsyncSingleton<T>(factory: () => Promise<T>): { getInstance: () => Promise<T>; resetInstance: () => void } {
    let instance: T | null = null;
    let initializing: Promise<T> | null = null;

    return {
        async getInstance(): Promise<T> {
            if (instance) return instance;
            if (!initializing) {
                initializing = factory().then(i => {
                    instance = i;
                    return i;
                });
            }
            return initializing;
        },
        resetInstance(): void {
            instance = null;
            initializing = null;
        },
    };
}