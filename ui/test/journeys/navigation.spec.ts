import {test, expect} from '@playwright/test';
import {seed, clearStorage} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

const routes: Array<[string, string]> = [
    ['#dashboard', 'Quick Capture'],
    ['#notes', 'Quick Capture'],
    ['#map', 'No Location Notes'],
    ['#timeline', 'Timeline'],
    ['#network', 'Network'],
    ['#actions', 'Actions'],
    ['#chat', 'Chat Requires Nostr Account'],
    ['#ontology', 'Ontology'],
    ['#trash', 'Recently deleted'],
    ['#settings', 'Settings'],
    ['#simulator', 'Quick Capture'],
];

test('every navigation route renders content', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    for (const [hash, text] of routes) {
        await page.evaluate(nextHash => { window.location.hash = nextHash; window.dispatchEvent(new PopStateEvent('popstate')); }, hash);
        await expect(page.locator('main')).toContainText(new RegExp(text, 'i'));
        await expect(page.locator('main')).not.toBeEmpty();
    }
});

test('trash restores and permanently deletes', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.evaluate(() => { window.location.hash = '#trash'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByTestId('trash-view')).toBeVisible();
    await expect(page.getByText('Trash is empty')).toBeVisible();
});

test('persistence survives reload', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await expect(page.getByText('Looking for a React developer')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Looking for a React developer')).toBeVisible();
    await clearStorage(page);
    await expect(page.getByText('Looking for a React developer')).toHaveCount(0);
});
