/**
 * Browser-safe entry point for Storage
 * Completely independent from Node.js Storage to avoid pulling in fs/promises
 */

export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}

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

export class MemoryStorageAdapter implements StorageAdapter {
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

// Default adapter selection
let defaultAdapter: StorageAdapter | null = null;

export function getDefaultAdapter(): StorageAdapter {
    if (defaultAdapter) return defaultAdapter;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        defaultAdapter = new BrowserStorageAdapter();
    } else {
        defaultAdapter = new MemoryStorageAdapter();
    }
    return defaultAdapter;
}

export function setDefaultAdapter(adapter: StorageAdapter): void {
    defaultAdapter = adapter;
}

/** High-level JSON storage with typed get/set */
export class JsonStore<T> {
    private data: T | null = null;
    private loaded = false;

    constructor(
        private key: string,
        private adapter: StorageAdapter = getDefaultAdapter()
    ) {}

    async load(): Promise<T | null> {
        if (this.loaded) return this.data;
        const stored = await this.adapter.getItem(this.key);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
            } catch {
                this.data = null;
            }
        }
        this.loaded = true;
        return this.data;
    }

    async save(data: T): Promise<void> {
        this.data = data;
        this.loaded = true;
        await this.adapter.setItem(this.key, JSON.stringify(data));
    }

    async clear(): Promise<void> {
        this.data = null;
        this.loaded = false;
        await this.adapter.removeItem(this.key);
    }

    get(): T | null {
        return this.data;
    }
}