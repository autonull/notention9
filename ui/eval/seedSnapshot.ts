import type { Page } from '@playwright/test';

/**
 * SeedSnapshot — Captures and restores complete browser state for deterministic replay
 * Includes IndexedDB (localforage), localStorage, and active revision set
 */

export interface SeedSnapshot {
    version: 1;
    capturedAt: string;
    indexedDB: Record<string, unknown>;
    localStorage: Record<string, string>;
    activeRevisions: ActiveRevisionSnapshot[];
    domHash: string;
    viewport: { width: number; height: number };
    url: string;
}

export interface ActiveRevisionSnapshot {
    seamRole: string;
    revisionId: string;
    strategyId: string;
    params: Record<string, unknown>;
}

export interface SnapshotOptions {
    includeIndexedDB?: boolean;
    includeLocalStorage?: boolean;
    includeRevisions?: boolean;
    computeDomHash?: boolean;
}

const DEFAULT_OPTIONS: Required<SnapshotOptions> = {
    includeIndexedDB: true,
    includeLocalStorage: true,
    includeRevisions: true,
    computeDomHash: true,
};

/**
 * Capture a complete snapshot of browser state
 */
export async function captureSnapshot(page: Page, options: SnapshotOptions = {}): Promise<SeedSnapshot> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const snapshot: SeedSnapshot = {
        version: 1,
        capturedAt: new Date().toISOString(),
        indexedDB: {},
        localStorage: {},
        activeRevisions: [],
        domHash: '',
        viewport: page.viewportSize() ?? { width: 1280, height: 720 },
        url: page.url(),
    };

    if (opts.includeIndexedDB) {
        snapshot.indexedDB = await captureIndexedDB(page);
    }

    if (opts.includeLocalStorage) {
        snapshot.localStorage = await captureLocalStorage(page);
    }

    if (opts.includeRevisions) {
        snapshot.activeRevisions = await captureActiveRevisions(page);
    }

    if (opts.computeDomHash) {
        snapshot.domHash = await computeDomHash(page);
    }

    return snapshot;
}

/**
 * Restore browser state from a snapshot
 */
export async function restoreSnapshot(page: Page, snapshot: SeedSnapshot): Promise<void> {
    // Navigate to the captured URL first
    await page.goto(snapshot.url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Restore localStorage
    if (Object.keys(snapshot.localStorage).length > 0) {
        await restoreLocalStorage(page, snapshot.localStorage);
    }

    // Restore IndexedDB (localforage)
    if (Object.keys(snapshot.indexedDB).length > 0) {
        await restoreIndexedDB(page, snapshot.indexedDB);
    }

    // Restore active revisions via app API
    if (snapshot.activeRevisions.length > 0) {
        await restoreActiveRevisions(page, snapshot.activeRevisions);
    }

    // Reload to apply all changes
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Verify DOM hash matches
    const currentDomHash = await computeDomHash(page);
    if (currentDomHash !== snapshot.domHash) {
        console.warn(`DOM hash mismatch after restore. Expected: ${snapshot.domHash}, Got: ${currentDomHash}`);
    }
}

/**
 * Capture all IndexedDB data from localforage database
 */
async function captureIndexedDB(page: Page): Promise<Record<string, unknown>> {
    return await page.evaluate(async () => {
        return new Promise<Record<string, unknown>>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyvaluepairs', 'readonly');
                const store = tx.objectStore('keyvaluepairs');
                const getAllRequest = store.getAll();
                const getAllKeysRequest = store.getAllKeys();

                getAllRequest.onsuccess = () => {
                    const values = getAllRequest.result;
                    getAllKeysRequest.onsuccess = () => {
                        const keys = getAllKeysRequest.result as IDBValidKey[];
                        const result: Record<string, unknown> = {};
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i];
                            const keyStr = typeof key === 'string' ? key : String(key);
                            result[keyStr] = values[i];
                        }
                        db.close();
                        resolve(result);
                    };
                };
                getAllRequest.onerror = () => reject(getAllRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    });
}

/**
 * Restore IndexedDB data to localforage database
 */
async function restoreIndexedDB(page: Page, data: Record<string, unknown>): Promise<void> {
    await page.evaluate(async (entries) => {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('keyvaluepairs', 'readwrite');
                const store = tx.objectStore('keyvaluepairs');

                // Clear existing data first
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => {
                    // Put all entries
                    for (const [key, value] of Object.entries(entries)) {
                        store.put(value, key);
                    }
                };

                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            };
            request.onerror = () => reject(request.error);
        });
    }, data);
}

/**
 * Capture all localStorage data
 */
async function captureLocalStorage(page: Page): Promise<Record<string, string>> {
    return await page.evaluate(() => {
        const result: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                result[key] = localStorage.getItem(key) ?? '';
            }
        }
        return result;
    });
}

/**
 * Restore localStorage data
 */
async function restoreLocalStorage(page: Page, data: Record<string, string>): Promise<void> {
    await page.evaluate((entries) => {
        localStorage.clear();
        for (const [key, value] of Object.entries(entries)) {
            localStorage.setItem(key, value);
        }
    }, data);
}

/**
 * Capture active revisions from the app's revision store
 */
async function captureActiveRevisions(page: Page): Promise<ActiveRevisionSnapshot[]> {
    return await page.evaluate(async () => {
        // Try to get active revisions from the app's revision store
        // This assumes the app exposes a way to get active revisions
        try {
            // Check if there's a global revision store or profile registry
            const profileRegistry = (window as any).__PROFILE_REGISTRY__;
            if (profileRegistry && typeof profileRegistry.getActiveRevisions === 'function') {
                return await profileRegistry.getActiveRevisions();
            }

            // Fallback: try to get from localStorage/IndexedDB if revisions are stored there
            const revisionsData = localStorage.getItem('activeRevisions') ||
                sessionStorage.getItem('activeRevisions');
            if (revisionsData) {
                return JSON.parse(revisionsData);
            }

            return [];
        } catch {
            return [];
        }
    });
}

/**
 * Restore active revisions via app API
 */
async function restoreActiveRevisions(page: Page, revisions: ActiveRevisionSnapshot[]): Promise<void> {
    await page.evaluate(async (revs) => {
        try {
            const profileRegistry = (window as any).__PROFILE_REGISTRY__;
            if (profileRegistry && typeof profileRegistry.setActiveRevisions === 'function') {
                await profileRegistry.setActiveRevisions(revs);
                return;
            }

            // Fallback: store in localStorage for app to pick up on next load
            localStorage.setItem('activeRevisions', JSON.stringify(revs));
        } catch (e) {
            console.warn('Failed to restore active revisions:', e);
        }
    }, revisions);
}

/**
 * Compute a hash of the visible DOM for replay verification
 * Hashes the body's outerHTML after normalizing dynamic attributes
 */
export async function computeDomHash(page: Page): Promise<string> {
    return await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;

        // Remove dynamic/timestamp elements that change between runs
        const dynamicSelectors = [
            '[data-timestamp]',
            '[data-generated]',
            '[data-session-id]',
            'script',
            'style',
            '[nonce]',
            'meta[name="viewport"]',
        ];

        for (const selector of dynamicSelectors) {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        }

        // Normalize attributes that may vary
        const allElements = clone.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove random IDs
            if (el.id && (el.id.includes('random') || el.id.includes('auto') || /^\w+-\d+-\w+$/.test(el.id))) {
                el.removeAttribute('id');
            }
            // Remove React/internal keys
            el.removeAttribute('data-reactroot');
            el.removeAttribute('data-reactid');
        });

        const html = clone.outerHTML;

        // Simple hash function (non-cryptographic, for comparison only)
        let hash = 0;
        for (let i = 0; i < html.length; i++) {
            const char = html.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Convert to hex string
        return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
    });
}

/**
 * Verify that a restored snapshot matches the original
 */
export async function verifySnapshot(page: Page, snapshot: SeedSnapshot): Promise<{ match: boolean; domHash: string; details: string[] }> {
    const currentDomHash = await computeDomHash(page);
    const details: string[] = [];

    if (currentDomHash === snapshot.domHash) {
        details.push('DOM hash matches');
    } else {
        details.push(`DOM hash mismatch: expected ${snapshot.domHash}, got ${currentDomHash}`);
    }

    // Check key storage keys
    const currentIndexedDB = await captureIndexedDB(page);
    const currentLocalStorage = await captureLocalStorage(page);

    for (const key of Object.keys(snapshot.indexedDB)) {
        if (JSON.stringify(currentIndexedDB[key]) === JSON.stringify(snapshot.indexedDB[key])) {
            details.push(`IndexedDB[${key}] matches`);
        } else {
            details.push(`IndexedDB[${key}] mismatch`);
        }
    }

    for (const key of Object.keys(snapshot.localStorage)) {
        if (currentLocalStorage[key] === snapshot.localStorage[key]) {
            details.push(`localStorage[${key}] matches`);
        } else {
            details.push(`localStorage[${key}] mismatch`);
        }
    }

    return {
        match: currentDomHash === snapshot.domHash,
        domHash: currentDomHash,
        details,
    };
}

/**
 * Create a run ID from manifest hash, revision ID, case ID, and repetition
 * Deterministic, never random
 */
export function generateRunId(
    manifestHash: string,
    revisionId: string,
    caseId: string,
    repetition: number
): string {
    const base = `${manifestHash}-${revisionId}-${caseId}-${repetition}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
        hash = ((hash << 5) - hash) + base.charCodeAt(i);
        hash = hash & hash;
    }
    return `run-${manifestHash}-${revisionId}-${caseId}-${repetition}-${hash >>> 0}`;
}