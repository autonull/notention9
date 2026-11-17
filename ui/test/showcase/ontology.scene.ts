import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes, taskNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('ontology graph', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.evaluate(() => { window.location.hash = '#ontology'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForSelector('main');
    await page.waitForSelector('text=shared vocabulary');
    await page.waitForSelector('text=Work');
    await snap(page, {
        area: 'ontology',
        state: 'graph',
        description: 'Ontology tree with domains, attributes, and usage counts.',
    });
});

test('actions board', async ({page}) => {
    await seed(page, {notes: [...demoNotes(), ...taskNotes()], settings: defaultSettings()});
    await page.evaluate(() => { window.location.hash = '#actions'; window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForSelector('main');
    await page.waitForSelector('[aria-label="Running"]');
    await snap(page, {
        area: 'actions',
        state: 'board',
        description: 'Task board grouped by status, with a new-task action.',
    });
});
