import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('chat explains that an identity is required', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#chat'});
    await expect(page.getByText('Chat Requires Nostr Account')).toBeVisible();
});

test('relay changes persist', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'});
    await page.getByRole('tab', {name: /Nostr Keys/}).click();
    const input = page.getByPlaceholder('wss://relay.example.com');
    await input.fill('ws://localhost:7001');
    await page.getByRole('button', {name: 'Add', exact: true}).click();
    await page.reload();
    await page.waitForSelector('[data-ready]');
    await page.getByRole('tab', {name: /Nostr Keys/}).click();
    await expect(page.getByText('ws://localhost:7001')).toBeVisible();
});

test('theme and developer mode persist', async ({page}) => {
    await seed(page, {
        notes: demoNotes(),
        settings: defaultSettings({developerMode: true, theme: 'light'}),
        hash: '#settings',
    });
    await page.reload();
    await page.waitForSelector('[data-ready]');
    const settings = await page.evaluate(async () => {
        const open = indexedDB.open('localforage');
        const db = await new Promise<IDBDatabase>(resolve => { open.onsuccess = () => resolve(open.result); });
        const tx = db.transaction('keyvaluepairs', 'readonly');
        const store = tx.objectStore('keyvaluepairs');
        const request = store.get('notention-settings-v2');
        return await new Promise((resolve) => { request.onsuccess = () => resolve(request.result); });
    });
    expect((settings as any).theme).toBe('light');
    expect((settings as any).developerMode).toBe(true);
});
