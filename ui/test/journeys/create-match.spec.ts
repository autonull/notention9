import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, noteWithDetails} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('compose a detail through the popup without bracket syntax', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});

    await page.getByTestId('add-detail').click();
    const dialog = page.getByRole('dialog');
    // Key input has placeholder "Key (e.g. price)"
    await dialog.getByPlaceholder('Key (e.g. price)').fill('skill');
    // Value input for string type has placeholder "e.g. Active, 100, 2024-01-01"
    await dialog.getByPlaceholder('e.g. Active, 100, 2024-01-01').fill('React');
    await dialog.getByRole('button', {name: 'Add detail'}).click();

    await expect(page.locator('.node-property').last()).toContainText('skill');
    await expect(page.locator('.node-property').last()).toContainText('React');

    const editorText = await page.locator('.ProseMirror').innerText();
    expect(editorText).not.toContain('[');
    expect(editorText).not.toContain(']');
});

test('chips open the same popup for editing', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.locator('.node-property').first().click();
    // Modal title is a heading with "Edit detail"
    await expect(page.getByRole('heading', {name: 'Edit detail'})).toBeVisible();
    // Key input has list="property-keys"
    await expect(page.locator('input[list="property-keys"]')).toHaveValue('status');
});
