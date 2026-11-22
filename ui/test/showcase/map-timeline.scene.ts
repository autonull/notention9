import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('map pins', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#map'});
    await page.getByRole('tablist', {name: 'View mode'}).waitFor({timeout: 15_000});
    await page.getByRole('tab', {name: 'Map'}).click();
    await page.getByRole('tab', {name: 'Map'}).waitFor();
    await snap(page, {
        area: 'map',
        state: 'pins',
        description: 'Notes with locations plotted on the map.',
    });
});

test('timeline month', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#timeline'});
    await page.getByRole('tablist', {name: 'View mode'}).waitFor({timeout: 15_000});
    await page.getByRole('tab', {name: 'Timeline'}).click();
    await page.getByRole('tab', {name: 'Timeline'}).waitFor();
    await snap(page, {
        area: 'timeline',
        state: 'month',
        description: 'Dated notes on a month calendar, filterable by location.',
    });
});
