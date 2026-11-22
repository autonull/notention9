import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('inbox empty (was dashboard)', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings()});
    await page.evaluate(() => { window.location.hash = '#inbox'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await snap(page, {
        area: 'inbox',
        state: 'empty',
        description: 'First run with an empty notebook and a sample-workspace affordance.',
    });
});

test('inbox populated (was dashboard)', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.evaluate(() => { window.location.hash = '#inbox'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await snap(page, {
        area: 'inbox',
        state: 'populated',
        description: 'Capture, a local match, and recent notes.',
    });
});
