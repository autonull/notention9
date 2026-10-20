import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('matching results', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.getByTestId('local-match').waitFor();
    await snap(page, {
        area: 'matching',
        state: 'results',
        description: 'A request matched against a local offer with scores, computed offline.',
    });
});

test('mobile notes', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await snap(page, {
        area: 'mobile',
        state: 'notes',
        description: 'Mobile list and bottom navigation.',
        viewport: 'mobile',
    });
});
