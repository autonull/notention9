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

test('matching explanation', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#notes/demo-request-react'});
    await page.getByRole('button', {name: 'Toggle Assistant'}).click();
    await page.getByRole('tab', {name: /Local/}).click();
    await page.waitForSelector('text=Match');
    await snap(page, {
        area: 'matching',
        state: 'explanation',
        description: 'Satisfied and conflicting constraints for a local offer, computed offline.',
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
