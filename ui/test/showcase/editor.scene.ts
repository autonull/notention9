import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, noteWithDetails} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('editor property chips', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByTestId('editor-content').waitFor({timeout: 15_000});
    await snap(page, {
        area: 'editor',
        state: 'property-chips',
        description: 'Prose with structured detail chips and no visible bracket syntax.',
    });
});

test('editor add detail', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByTestId('editor-content').waitFor({timeout: 15_000});
    await page.getByTestId('add-detail').click();
    await page.waitForSelector('text=Add detail');
    await snap(page, {
        area: 'editor',
        state: 'add-detail',
        description: 'Type-aware popup for adding a structured detail.',
    });
});

test('editor property inspector', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByRole('button', {name: /Structured details/}).click();
    await page.getByText(/\d+ Properties/).waitFor({timeout: 15_000});
    await snap(page, {
        area: 'editor',
        state: 'property-inspector',
        description: 'The details drawer with typed widgets, ontology hints, and validation.',
    });
});

test('editor template selector', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByTestId('editor-content').waitFor({timeout: 15_000});
    await page.getByRole('button', {name: 'More actions'}).click();
    await page.getByText('Save as Template').click();
    await page.getByRole('dialog', {name: 'Save as Template'}).waitFor({timeout: 5_000});
    await snap(page, {
        area: 'editor',
        state: 'template-selector',
        description: 'Save a note as a reusable template with a name.',
    });
});

test('editor publish panel', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByTestId('editor-content').waitFor({timeout: 15_000});
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    await page.waitForSelector('text=Review before publishing');
    await snap(page, {
        area: 'editor',
        state: 'publish-panel',
        description: 'Publish disclosure with a human summary and a collapsed raw event.',
    });
});

test('editor extraction review', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByTestId('editor-content').waitFor({timeout: 15_000});
    await page.getByTestId('describe-it').click();
    const input = page.getByTestId('describe-it-input');
    await input.waitFor({timeout: 5_000});
    await input.fill('Need a React developer for two weeks, up to 900 USD, starting next week');
    await page.getByTestId('describe-it-suggest').click();
    await page.getByTestId('describe-it-suggestion').first().waitFor({timeout: 15_000});
    await snap(page, {
        area: 'editor',
        state: 'extraction-review',
        description: 'Deterministic suggestions with accept/reject and a source label.',
    });
});
