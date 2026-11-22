import type {Page} from '@playwright/test';

export interface JournalEvent {
    bucket: string;
    timestamp?: string;
    sessionId?: string;
    workflow: string;
    seam: string;
    kind: string;
    count: number;
    noteId?: string;
}

/**
 * Read the friction journal the app wrote to IndexedDB.
 * The journal stores through JsonStore, so the stored value is a JSON string.
 */
export async function readFrictionJournal(page: Page): Promise<JournalEvent[]> {
    return page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('notention-journal');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const events = await new Promise<unknown[]>((resolve, reject) => {
            try {
                const tx = db.transaction('friction', 'readonly');
                const request = tx.objectStore('friction').get('friction-journal');
                tx.oncomplete = () => {
                    const raw = request.result;
                    if (raw === null || raw === undefined) return resolve([]);
                    try {
                        resolve(typeof raw === 'string' ? JSON.parse(raw) : raw);
                    } catch {
                        resolve([]);
                    }
                };
                tx.onerror = () => reject(request.error);
            } catch {
                resolve([]);
            }
        });

        db.close();
        return events as never;
    });
}

/**
 * Wait until an event of a kind shows up in the journal.
 * The journal writes asynchronously, so the wait is the honest way to read it.
 */
export async function waitForFrictionEvent(
    page: Page,
    kind: string,
    timeoutMs = 15_000
): Promise<JournalEvent> {
    const handle = await page.waitForFunction(async (eventKind) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('notention-journal');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const events = await new Promise<JournalEvent[]>((resolve, reject) => {
            try {
                const tx = db.transaction('friction', 'readonly');
                const request = tx.objectStore('friction').get('friction-journal');
                tx.oncomplete = () => {
                    const raw = request.result;
                    if (raw === null || raw === undefined) return resolve([]);
                    try {
                        resolve(typeof raw === 'string' ? JSON.parse(raw) : raw);
                    } catch {
                        resolve([]);
                    }
                };
                tx.onerror = () => reject(request.error);
            } catch {
                resolve([]);
            }
        });

        db.close();
        return events.filter(event => event.kind === eventKind).pop();
    }, kind, {timeout: timeoutMs, polling: 250});

    return await handle.jsonValue() as JournalEvent;
}
