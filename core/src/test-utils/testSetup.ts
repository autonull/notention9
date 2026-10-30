import { vi, afterEach, beforeAll, afterAll } from 'vitest';

export const MEMORY_THRESHOLD_MB = 500;
export const MEMORY_THRESHOLD_BYTES = MEMORY_THRESHOLD_MB * 1024 * 1024;

export function setupTestEnvironment(): void {
    if (typeof window !== 'undefined') {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

        const localStorageMock = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            get length() { return 0; },
            key: vi.fn(() => null),
        };
        Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

        const sessionStorageMock = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            get length() { return 0; },
            key: vi.fn(() => null),
        };
        Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

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