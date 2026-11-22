import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('matching results', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#chat'});
    await page.getByRole('tablist', {name: 'Connections tabs'}).waitFor({timeout: 15_000});
    await page.getByRole('tab', {name: /Matches/}).click();
    await page.getByRole('tab', {name: /Matches/}).waitFor();
    await snap(page, {
        area: 'matching',
        state: 'results',
        description: 'Requests matched against local offers in the Connections view.',
    });
});

test('mobile notes', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#notes'});
    await snap(page, {
        area: 'mobile',
        state: 'notes',
        description: 'The mobile note list with bottom navigation.',
        viewport: 'mobile',
    });
});
