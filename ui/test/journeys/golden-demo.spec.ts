import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

const AI_HOSTS = /generativelanguage\.googleapis\.com|huggingface\.co|mlc\.ai|openai\.com|anthropic\.com/;

const trackAiRequests = (page: Page): string[] => {
    const requests: string[] = [];
    page.on('request', request => {
        if (AI_HOSTS.test(request.url())) requests.push(request.url());
    });
    return requests;
};

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('sample workspace shows explained match for React developer', async ({page}) => {
    const aiRequests = trackAiRequests(page);
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Debug: check what notes are loaded
    const notesInStorage = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('localforage');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('keyvaluepairs', 'readonly');
        const store = tx.objectStore('keyvaluepairs');
        const notesReq = store.get('notention-notes');
        const settingsReq = store.get('notention-settings-v2');
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve({notes: notesReq.result, settings: settingsReq.result});
            tx.onerror = () => reject(tx.error);
        });
    });
    console.log('Notes count:', notesInStorage?.notes?.length);
    console.log('First note:', JSON.stringify(notesInStorage?.notes?.[0], null, 2));
    console.log('Second note:', JSON.stringify(notesInStorage?.notes?.[1], null, 2));
    console.log('Settings:', JSON.stringify(notesInStorage?.settings, null, 2));

    // Navigate to dashboard
    await page.evaluate(() => {
        window.location.hash = '#dashboard';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Debug: check what's on the page
    await page.waitForTimeout(5000);
    const pageState = await page.evaluate(() => {
        return {
            hasDataReady: !!document.querySelector('[data-ready]'),
            hasRoot: !!document.querySelector('#root'),
            bodyHTML: document.body.innerHTML.slice(0, 2000),
            locationHash: window.location.hash
        };
    });
    console.log('Page state:', JSON.stringify(pageState, null, 2));

    // Wait for match to appear
    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 30_000});

    // Verify it's the React developer match
    await expect(match).toContainText('Looking for a React developer');
    await expect(match).toContainText('React developer available');

    // Open match explanations
    const detailsSummary = match.getByTestId('match-explanations').locator('summary');
    await expect(detailsSummary).toBeVisible();
    await detailsSummary.click();

    // Verify explanation details are visible with reasons
    await expect(match.getByText('Why it fits')).toBeVisible();
    await expect(match.getByText('skill')).toBeVisible();
    await expect(match.getByText('React')).toBeVisible();
    await expect(match.getByText('Exact match')).toBeVisible();

    // Verify rate comparison shows units (USD/project)
    await expect(match.getByText('USD/project')).toBeVisible();

    expect(aiRequests).toEqual([]);
});