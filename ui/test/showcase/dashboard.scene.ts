import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('dashboard empty', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings()});
    await snap(page, {
        area: 'dashboard',
        state: 'empty',
        description: 'First run with an empty notebook and a sample-workspace affordance.',
    });
});

test('dashboard populated', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await snap(page, {
        area: 'dashboard',
        state: 'populated',
        description: 'Stats, an offline match preview, recent activity, and tools.',
    });
});
