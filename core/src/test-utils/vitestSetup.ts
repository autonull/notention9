// Polyfill localStorage/sessionStorage for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map<string, string>();
    const createStorage = () => ({
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, String(value)); },
        removeItem: (key: string) => { storage.delete(key); },
        clear: () => { storage.clear(); },
        get length() { return storage.size; },
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
    });
    Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), writable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), writable: true });
}

// Do NOT polyfill window globally - it breaks testSetup.ts checks

import { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard } from './testSetup.js';

setupTestEnvironment();
initMemoryGuard();

import { metaphorRegistry } from '../index.js';

afterEach(() => {
    cleanupTestEnvironment();
    metaphorRegistry.clear();
});

afterAll(() => {
    vi.clearAllMocks();
    metaphorRegistry.clear();
    if (global.gc) {
        global.gc();
    }
});

export { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard };