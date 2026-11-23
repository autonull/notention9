import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
});

test('mobile has one composer and no bottom bar', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});

    await expect(page.getByRole('button', {name: 'New note'}).first()).toBeVisible();
    await expect(page.getByRole('tablist', {name: 'Main navigation'})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Settings'})).toBeVisible();
});

test('mobile note detail is full-screen with a context sheet', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes/demo-request-react'});

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    const titleFont = await page.locator('#note-title-input').evaluate((element) =>
        parseFloat(window.getComputedStyle(element).fontSize)
    );
    expect(titleFont).toBeGreaterThanOrEqual(28);
    const bodyFont = await page.locator('.ProseMirror').evaluate((element) =>
        parseFloat(window.getComputedStyle(element).fontSize)
    );
    expect(bodyFont).toBeGreaterThanOrEqual(16);
    const rail = page.getByRole('complementary', {name: 'Note context'});
    if (!(await rail.isVisible())) await page.getByRole('button', {name: /Context/}).click();
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Next'})).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Matches'})).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Replies'})).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Chat'})).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});

test('mobile mode surfaces fill the screen and return to the list', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes?mode=canvas'});

    await expect(page.getByTestId('notes-grid-items')).toBeVisible();
    await expect(page.getByText('Canvas', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Notes', exact: true}).click();

    await expect(page.getByTestId('note-history-rail')).toBeVisible();
    await expect(page.getByTestId('notes-grid-items')).toHaveCount(0);
});

test('mobile capture creates a note on the same screen path', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings(), hash: '#/notes'});

    await page.getByRole('button', {name: 'New note'}).first().click();

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await page.locator('#note-title-input').fill('Garden help on Saturdays #offer');
    await expect(page.locator('#note-title-input')).toHaveValue(/Garden help/);
});
