import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('network no identity', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#network'});
    await snap(page, {
        area: 'network',
        state: 'connect-identity',
        description: 'Network view before an identity exists, prompting setup.',
    });
});

test('settings networks', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'});
    await page.getByRole('tab', {name: /Networks/}).click();
    await page.waitForTimeout(200);
    await snap(page, {
        area: 'settings',
        state: 'networks',
        description: 'Provider status and relay management.',
    });
});
