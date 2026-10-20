import type {Page} from '@playwright/test';

export const NAV = {
    dashboard: 'Dashboard',
    notes: 'Notes',
    map: 'Map',
    timeline: 'Timeline',
    network: 'Network',
    actions: 'Actions',
    chat: 'Chat',
    ontology: 'Ontology',
};

export const noteList = (page: Page) => page.locator('.note-list-item');
export const main = (page: Page) => page.locator('main');

export const openCommandPalette = async (page: Page) => {
    await page.keyboard.press('Control+k');
    await page.waitForSelector('input[placeholder="Type a command or search notes..."]');
};
