import type {Page} from '@playwright/test';

export const NAV = {
    notes: 'Notes',
    settings: 'Settings',
};

export const noteList = (page: Page) => page.locator('.note-list-item');
export const main = (page: Page) => page.locator('main');

export const openCommandPalette = async (page: Page) => {
    await page.keyboard.press('Control+k');
    await page.waitForSelector('input[placeholder="Search notes, details, tags, and commands…"]');
};
