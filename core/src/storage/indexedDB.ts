/**
 * IndexedDB storage adapter for JsonStore
 * Provides persistent, high-capacity storage in browser environments
 */

import type { StorageAdapter } from './Storage.js';

const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

export class IndexedDBAdapter implements StorageAdapter {
    private dbName: string;
    private storeName: string;
    private db: IDBDatabase | null = null;
    private ready: Promise<void> | null = null;

    constructor(dbName: string = 'notention', storeName: string = 'keyval') {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    private async init(): Promise<void> {
        if (this.db) return;
        if (this.ready) return this.ready;

        this.ready = new Promise((resolve, reject) => {
            if (!isBrowser) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });

        return this.ready;
    }

    async getItem(key: string): Promise<string | null> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ?? null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async setItem(key: string, value: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(value, key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async removeItem(key: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async clear(): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.ready = null;
        }
    }
}

/**
 * Get an IndexedDB adapter instance (singleton per database)
 */
const adapterCache = new Map<string, IndexedDBAdapter>();

export function getIndexedDBAdapter(dbName?: string, storeName?: string): IndexedDBAdapter {
    const key = `${dbName ?? 'notention'}:${storeName ?? 'keyval'}`;
    if (!adapterCache.has(key)) {
        adapterCache.set(key, new IndexedDBAdapter(dbName, storeName));
    }
    return adapterCache.get(key)!;
}