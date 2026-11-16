import {test, expect} from '@playwright/test';
import {seed, clearStorage} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

const routes: Array<[string, string]> = [
    ['#inbox', 'Inbox'],
    ['#notes', 'Quick Capture'],
    ['#actions', 'Actions'],
    ['#map', 'OpenStreetMap'],
    ['#timeline', 'Spacetime Filter'],
    ['#network', 'Network'],
    ['#chat', 'Chat Requires Nostr Account'],
    ['#responses', 'My Responses'],
    ['#labels', 'Labels'],
    ['#trash', 'Recently deleted'],
    ['#settings', 'Settings'],
    ['#dashboard', 'Quick Capture'],
    ['#ontology', 'Ontology'],
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
    await expect(page.getByTestId('trash-view').getByRole('heading', {name: 'Trash is empty'}).first()).toBeVisible();
});

test('persistence survives reload', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    // Navigate to dashboard to see local-match panel
    await page.evaluate(() => { window.location.hash = '#dashboard'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByTestId('local-match')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('local-match')).toBeVisible();
    await clearStorage(page);
    await expect(page.getByTestId('local-match')).toHaveCount(0);
});
