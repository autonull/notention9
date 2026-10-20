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
