/**
 * Unified Singleton Factory
 * Provides consistent singleton pattern across all modules
 */

export interface Singleton<T> {
    get(): T;
    reset(): void;
}

export interface AsyncSingleton<T> {
    get(): Promise<T>;
    reset(): void;
}

/**
 * Create a singleton instance with get/reset functions
 * Standardized naming: get() / reset()
 */
export function createSingleton<T>(factory: () => T): Singleton<T> {
    let instance: T | null = null;

    return {
        get(): T {
            if (!instance) {
                instance = factory();
            }
            return instance;
        },
        reset(): void {
            instance = null;
        },
    };
}

/**
 * Create an async singleton instance with get/reset functions
 */
export function createAsyncSingleton<T>(factory: () => Promise<T>): AsyncSingleton<T> {
    let instance: T | null = null;
    let initializing: Promise<T> | null = null;

    return {
        async get(): Promise<T> {
            if (instance) return instance;
            if (!initializing) {
                initializing = factory().then(i => {
                    instance = i;
                    return i;
                });
            }
            return initializing;
        },
        reset(): void {
            instance = null;
            initializing = null;
        },
    };
}

/**
 * Create a lazy-initialized singleton that calls init() on first access
 * Useful for services that need async initialization
 */
export function createInitializedSingleton<T extends { init(): Promise<void> }>(
    factory: () => T
): Singleton<T> {
    let instance: T | null = null;
    let initPromise: Promise<void> | null = null;

    return {
        get(): T {
            if (!instance) {
                instance = factory();
                initPromise = instance.init();
            }
            // Note: caller should await initPromise if needed
            return instance;
        },
        reset(): void {
            instance = null;
            initPromise = null;
        },
    };
}

/**
 * Create a singleton with explicit initialization
 * Returns both the singleton and an init function
 */
export function createLazySingleton<T>(factory: () => T): { get: () => T; init: () => T; reset: () => void } {
    let instance: T | null = null;

    return {
        get(): T {
            if (!instance) {
                instance = factory();
            }
            return instance;
        },
        init(): T {
            instance = factory();
            return instance;
        },
        reset(): void {
            instance = null;
        },
    };
}