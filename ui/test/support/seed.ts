import type {Page} from '@playwright/test';
import {STORAGE_KEYS} from '../../src/config/storageKeys';
import type {AppSettings, Note, SortOrder, SidebarViewMode} from '../../../core/src/index';

export interface SeedOptions {
    notes?: Note[];
    settings?: AppSettings;
    sortOrder?: SortOrder;
    sidebarViewMode?: SidebarViewMode;
    hash?: string;
}

const put = async (page: Page, entries: Record<string, unknown>) => {
    await page.evaluate(async (pairs) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('keyvaluepairs', 'readwrite');
        const store = tx.objectStore('keyvaluepairs');
        Object.entries(pairs).forEach(([key, value]) => store.put(value, key));
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
        db.close();
    }, entries);
};

export async function seed(page: Page, options: SeedOptions) {
    await page.goto(options.hash ? `/${options.hash}` : '/');
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));

    const entries: Record<string, unknown> = {};
    if (options.notes) entries[STORAGE_KEYS.notes] = options.notes;
    if (options.settings) entries[STORAGE_KEYS.settings] = options.settings;
    if (options.sortOrder) entries[STORAGE_KEYS.sortOrder] = options.sortOrder;
    if (options.sidebarViewMode) entries[STORAGE_KEYS.sidebarViewMode] = options.sidebarViewMode;

    await put(page, entries);
    await page.reload();
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
}

export async function clearStorage(page: Page) {
    await page.goto('about:blank');
    await page.evaluate(async () => {
        localStorage.clear();
        await new Promise<void>(resolve => {
            const request = indexedDB.deleteDatabase('localforage');
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
        });
    });
    await page.goto('/');
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
}
