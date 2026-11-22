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
    const palette = page.getByRole('dialog', {name: 'Search'});
    await palette.waitFor({timeout: 10_000});
    const input = palette.getByPlaceholder('Search notes, details, tags, and commands…');
    await input.waitFor({timeout: 5_000});
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
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-shortcuts-help')));
    await page.getByRole('dialog', {name: 'Keyboard Shortcuts'}).waitFor({timeout: 10_000});
    await snap(page, {
        area: 'modals',
        state: 'help',
        description: 'Keyboard shortcut reference grouped by task.',
    });
});
