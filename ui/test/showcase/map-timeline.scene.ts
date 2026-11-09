import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('map pins', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.locator('header button[aria-label="Map"]').click();
    await page.waitForSelector('header button[aria-label="Map"][aria-pressed="true"]');
    await page.locator('.leaflet-marker-icon').first().waitFor();
    await page.locator('.leaflet-marker-icon').first().click({force: true});
    await page.waitForSelector('.leaflet-popup-content');
    await snap(page, {
        area: 'map',
        state: 'pins',
        description: 'Geographic notes on the map with a selected note popup.',
    });
});

test('timeline month', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.locator('header button[aria-label="Timeline"]').click();
    await page.waitForSelector('header button[aria-label="Timeline"][aria-pressed="true"]');
    await page.locator('.rbc-calendar').waitFor();
    await page.waitForSelector('text=Community meetup');
    await snap(page, {
        area: 'timeline',
        state: 'month',
        description: 'Month calendar with dated notes and deadlines.',
    });
});
