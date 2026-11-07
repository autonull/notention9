/**
 * Browser-safe entry point for Storage
 * Excludes Node.js-only NodeStorageAdapter
 */

import type { StorageAdapter } from './Storage.js';
import { JsonStore, setDefaultAdapter } from './Storage.js';

// Re-export all types and browser-safe classes
export type { StorageAdapter } from './Storage.js';
export { JsonStore, setDefaultAdapter } from './Storage.js';

// Override getDefaultAdapter to never use NodeStorageAdapter in browser
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

let defaultAdapter: StorageAdapter | null = null;

class BrowserStorageAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }
    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }
    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
    async clear(): Promise<void> {
        localStorage.clear();
    }
}

class MemoryStorageAdapter implements StorageAdapter {
    private store = new Map<string, string>();

    async getItem(key: string): Promise<string | null> {
        return this.store.get(key) ?? null;
    }
    async setItem(key: string, value: string): Promise<void> {
        this.store.set(key, value);
    }
    async removeItem(key: string): Promise<void> {
        this.store.delete(key);
    }
    async clear(): Promise<void> {
        this.store.clear();
    }
}

export function getDefaultAdapter(): StorageAdapter {
    if (defaultAdapter) return defaultAdapter;
    if (isBrowser) {
        defaultAdapter = new BrowserStorageAdapter();
    } else {
        defaultAdapter = new MemoryStorageAdapter();
    }
    return defaultAdapter;
}