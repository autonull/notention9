import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {demoNotes, defaultSettings} from '../fixtures/workspace';
import {isolateNetwork} from '../fixtures/routes';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('a new label opens a page that carries it', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/settings/labels'});

    await page.getByLabel('New label').fill('hiring');
    await page.getByRole('button', {name: 'Add', exact: true}).click();

    await expect(page.locator('#note-title-input')).toBeFocused();
    await expect(page.getByRole('button', {name: 'Remove tag hiring'})).toBeVisible();
});

test('removing a label asks first and keeps the notes', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/settings/labels'});

    await page.getByRole('button', {name: 'Delete event'}).click();
    await expect(page.getByRole('heading', {name: 'Remove #event?'})).toBeVisible();
    await page.getByRole('button', {name: 'Cancel'}).click();
    await expect(page.getByRole('button', {name: 'Delete event'})).toBeVisible();

    await page.getByRole('button', {name: 'Delete event'}).click();
    await page.getByRole('button', {name: 'Remove label'}).click();
    await expect(page.getByRole('button', {name: 'Delete event'})).toHaveCount(0);
});

test('advanced opens the ontology editor', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/settings/labels'});

    await page.getByRole('button', {name: /Advanced: attributes/}).click();
    await expect(page.getByText('shared vocabulary')).toBeVisible();
});
