// One-time global setup for Vitest
// Runs once before all test files

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

// Initialize test environment once (doesn't use Vitest functions)
import { setupTestEnvironment } from './testSetup.js';

setupTestEnvironment();

// Export empty setup function for Vitest
export function setup() {}