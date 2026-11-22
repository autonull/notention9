import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
});

test('mobile has one composer and no bottom bar', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});

    await expect(page.getByTestId('quick-capture-input')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Capture a new note'})).toBeVisible();
    await expect(page.getByRole('tablist', {name: 'Main navigation'})).toHaveCount(0);

    const fontSize = await page.getByTestId('quick-capture-input').evaluate((element) =>
        parseFloat(window.getComputedStyle(element).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(18);
});

test('mobile note detail is full-screen with a context sheet', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes/demo-request-react'});

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    const rail = page.getByRole('complementary', {name: 'Note context'});
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Next steps'})).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Matches'})).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Replies'})).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});

test('mobile capture creates a note on the same screen path', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings(), hash: '#/notes'});

    await page.getByTestId('quick-capture-input').fill('Garden help on Saturdays #offer');
    await page.getByTestId('quick-capture-input').press('Enter');

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await expect(page.getByRole('complementary', {name: 'Note context'})).toBeVisible();
});
