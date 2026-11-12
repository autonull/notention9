import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, extractionNote, noteWithDetails} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('editor property chips', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await snap(page, {
        area: 'editor',
        state: 'property-chips',
        description: 'Prose with structured detail chips and no visible bracket syntax.',
    });
});

test('editor add detail', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
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
    await page.getByRole('button', {name: 'Toggle Assistant'}).click();
    await page.getByRole('tab', {name: /Props/}).click();
    await page.waitForSelector('text=Properties');
    await snap(page, {
        area: 'editor',
        state: 'property-inspector',
        description: 'Inspector with typed widgets, ontology hints, and validation.',
    });
});

test('editor template selector', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByRole('button', {name: 'Insert Template'}).click();
    await page.waitForSelector('text=Post Job');
    await snap(page, {
        area: 'editor',
        state: 'template-selector',
        description: 'Ontology-derived templates for requests, offers, and events.',
    });
});

test('editor publish panel', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    await page.waitForSelector('text=Review before publishing');
    await snap(page, {
        area: 'editor',
        state: 'publish-panel',
        description: 'Publish disclosure with a human summary and a collapsed raw event.',
    });
});

test('editor extraction review', async ({page}) => {
    await seed(page, {notes: [extractionNote()], settings: defaultSettings(), hash: '#notes/scene-extraction-note'});
    await page.getByRole('button', {name: 'Toggle Assistant'}).click();
    await page.getByRole('tab', {name: /Props/}).click();
    await page.getByTestId('extraction-review').waitFor({timeout: 10_000});
    await snap(page, {
        area: 'editor',
        state: 'extraction-review',
        description: 'Deterministic suggestions with confidence and accept/reject, no model configured.',
    });
});
