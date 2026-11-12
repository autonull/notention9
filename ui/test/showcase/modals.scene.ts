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
    const palette = page.getByRole('dialog', {name: 'Command Palette'});
    const input = palette.getByRole('combobox', {name: 'Search commands and notes'});
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
    const palette = page.getByRole('dialog', {name: 'Command Palette'});
    const input = palette.getByRole('combobox', {name: 'Search commands and notes'});
    await input.waitFor();
    await input.fill('help');
    await palette.getByRole('option', {name: /Open Help & Shortcuts/}).click();
    await page.getByRole('dialog', {name: 'Help & Shortcuts'}).waitFor();
    await snap(page, {
        area: 'modals',
        state: 'help',
        description: 'Concept and shortcut reference, including a pointer to Add detail.',
    });
});
