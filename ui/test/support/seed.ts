import type {Page} from '@playwright/test';
import {STORAGE_KEYS} from '../../src/config/storageKeys';
import type {AppSettings, Note, SortOrder, SidebarViewMode} from '../../../core/src/index';
import {clearRelay} from './relay';

export interface SeedOptions {
    notes?: Note[];
    settings?: AppSettings;
    sortOrder?: SortOrder;
    sidebarViewMode?: SidebarViewMode;
    hash?: string;
    storage?: Record<string, unknown>;
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
    // Public feeds must not inherit notes from an earlier test. Showcase scenes
    // publish before seeding, so they clear the relay in their own beforeAll.
    if (process.env.SCREENSHOT_ISOLATION !== '1') await clearRelay();

    // App uses hash-based routing; callers pass '#view' values.
    const hash = options.hash ? (options.hash.startsWith('#') ? options.hash : `#${options.hash}`) : '';
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4199';
    const url = hash ? `${baseURL}/${hash}` : baseURL;
    await page.goto(url);
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 300)));

    const entries: Record<string, unknown> = {};
    if (options.notes) entries[STORAGE_KEYS.notes] = options.notes;
    if (options.settings) entries[STORAGE_KEYS.settings] = options.settings;
    if (options.sortOrder) entries[STORAGE_KEYS.sortOrder] = options.sortOrder;
    if (options.sidebarViewMode) entries[STORAGE_KEYS.sidebarViewMode] = options.sidebarViewMode;
    if (options.storage) Object.assign(entries, options.storage);

    await put(page, entries);
    await page.reload();
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
}

export async function clearStorage(page: Page) {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4199';
    await page.goto(baseURL);
    await page.waitForSelector('[data-ready]');
    await page.evaluate(async () => {
        localStorage.clear();
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('keyvaluepairs', 'readwrite');
        tx.objectStore('keyvaluepairs').clear();
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
        db.close();
    });
    await page.reload();
    await page.waitForSelector('[data-ready]');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
}
