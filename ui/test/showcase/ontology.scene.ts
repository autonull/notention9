import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes, taskNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('ontology graph', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#ontology'});
    await page.getByRole('tab', {name: 'Ontology'}).click();
    await page.waitForSelector('text=shared vocabulary', {timeout: 15_000});
    await snap(page, {
        area: 'ontology',
        state: 'graph',
        description: 'Ontology tree with domains, attributes, and usage counts.',
    });
});

test('actions board', async ({page}) => {
    await seed(page, {notes: [...demoNotes(), ...taskNotes()], settings: defaultSettings(), hash: '#actions'});
    await page.getByRole('tablist', {name: 'View mode'}).waitFor({timeout: 15_000});
    await page.getByRole('tab', {name: 'Board'}).click();
    await page.getByRole('tablist', {name: 'Notes sections'}).getByRole('tab', {name: /Tasks/}).click();
    await page.getByRole('tab', {name: 'Board'}).waitFor();
    await snap(page, {
        area: 'actions',
        state: 'board',
        description: 'Task board grouped by status, with a new-task action.',
    });
});
