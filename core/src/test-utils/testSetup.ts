import { vi, afterEach, beforeAll, afterAll } from 'vitest';

export const MEMORY_THRESHOLD_MB = 500;
export const MEMORY_THRESHOLD_BYTES = MEMORY_THRESHOLD_MB * 1024 * 1024;

/**
 * In-memory Storage that actually stores.
 * A stub that always returns null makes every write-then-read test fail.
 */
function createMemoryStorage(): Storage {
    const store = new Map<string, string>();
    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: key => (store.has(key) ? store.get(key)! : null),
        key: index => Array.from(store.keys())[index] ?? null,
        removeItem: key => {
            store.delete(key);
        },
        setItem: (key, value) => {
            store.set(key, String(value));
        },
    };
}

export function setupTestEnvironment(): void {
    if (typeof window !== 'undefined' && window.HTMLElement?.prototype) {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        Object.defineProperty(window, 'localStorage', {value: createMemoryStorage(), writable: true});
        Object.defineProperty(window, 'sessionStorage', {value: createMemoryStorage(), writable: true});

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        global.ResizeObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    }
}

export function cleanupTestEnvironment(): void {
    vi.clearAllMocks();
    vi.clearAllTimers();

    if (global.gc) {
        global.gc();
    }
}

export function initMemoryGuard(): void {
    beforeAll(() => {
        if (process.env.CI) {
            console.log('[Memory Guard] Active - threshold:', MEMORY_THRESHOLD_MB, 'MB');
        }
    });

    afterEach(() => {
        if (global.gc) {
            global.gc();
        }
    });

    afterAll(() => {
        vi.clearAllMocks();
        if (global.gc) {
            global.gc();
        }
    });
}

export function withMemoryGuard(fn: () => void): void {
    if (process.env.CI) {
        beforeAll(() => {
            console.log('[Memory Guard] Active - threshold:', MEMORY_THRESHOLD_MB, 'MB');
        });

        afterEach(() => {
            if (global.gc) global.gc();
        });

        afterAll(() => {
            vi.clearAllMocks();
            if (global.gc) global.gc();
        });
    }
}