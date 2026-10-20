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
    await page.getByPlaceholder('e.g. status, price, deadline').fill('skill');
    await page.getByPlaceholder('e.g. Active, 100, 2024-01-01').fill('React');
    await page.getByRole('button', {name: 'Add detail'}).click();

    await expect(page.locator('.node-property').last()).toContainText('skill');
    await expect(page.locator('.node-property').last()).toContainText('React');

    const editorText = await page.locator('.ProseMirror').innerText();
    expect(editorText).not.toContain('[');
    expect(editorText).not.toContain(']');
});

test('chips open the same popup for editing', async ({page}) => {
    await seed(page, {notes: [noteWithDetails()], settings: defaultSettings(), hash: '#notes/scene-editor-note'});
    await page.locator('.node-property').first().click();
    await expect(page.getByText('Edit detail')).toBeVisible();
    await expect(page.locator('input[list="learned-keys"]')).toHaveValue('status');
});
