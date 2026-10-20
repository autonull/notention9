import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('command palette', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.keyboard.press('Control+k');
    const input = page.locator('input[placeholder="Type a command or search notes..."]');
    await input.waitFor();
    await input.fill('react');
    await page.waitForTimeout(200);
    await snap(page, {
        area: 'modals',
        state: 'command-palette',
        description: 'Command palette with a query matching notes and commands.',
    });
});

test('help', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    await page.keyboard.press('Control+k');
    const input = page.locator('input[placeholder="Type a command or search notes..."]');
    await input.waitFor();
    await input.fill('help');
    await page.getByText('Open Help & Shortcuts').click();
    await page.waitForSelector('text=Help & Shortcuts');
    await snap(page, {
        area: 'modals',
        state: 'help',
        description: 'Concept and shortcut reference, including a pointer to Add detail.',
    });
});
