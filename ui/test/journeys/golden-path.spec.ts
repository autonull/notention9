import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

const open = async (page: import('@playwright/test').Page, hash: string) => {
    await page.evaluate((value) => {
        window.location.hash = value;
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, hash);
};

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('capture one sentence and land in the note with one next step', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings()});
    await open(page, '#/notes');

    const capture = page.getByTestId('quick-capture-input');
    await expect(capture).toBeVisible();
    await capture.fill('Looking for a React developer #request');
    await capture.press('Enter');

    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toBeVisible();
    await expect(editor).toContainText('Looking for a React developer');
    const rail = page.getByRole('complementary', {name: 'Note context'});
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Next steps'})).toHaveAttribute('aria-selected', 'true');
});

test('respond to a match from the note context rail', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes/demo-request-react?tab=matches'});

    const rail = page.getByRole('complementary', {name: 'Note context'});
    await expect(rail).toBeVisible();
    await expect(page.getByTestId('note-matches')).toBeVisible();
    await rail.getByRole('button', {name: /Respond/}).first().click();

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await expect(page.locator('#note-title-input')).toHaveValue(/^Re: /);
});

test('one search overlay finds notes and commands', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});
    await page.keyboard.press('Control+K');

    const dialog = page.getByRole('dialog', {name: 'Search'});
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Search notes, details, tags, and commands…').fill('React');
    await expect(dialog.getByText('Looking for a React developer').first()).toBeVisible();
});

test('the top bar has one entry and no Inbox or Connections tabs', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});

    const header = page.locator('header').first();
    await expect(header.getByRole('button', {name: /Inbox|Connections|Network/})).toHaveCount(0);
    await expect(page.getByTestId('quick-capture-input')).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'New note'})).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'Settings'})).toHaveCount(1);
});

test('settings deep link opens the named tab', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/settings/skills'});

    await expect(page.getByRole('heading', {name: 'Settings', exact: true})).toBeVisible();
    await expect(page.getByRole('tabpanel', {name: 'Skills'})).toBeVisible();
    await expect(page.getByRole('tab', {name: 'Skills'})).toHaveAttribute('aria-selected', 'true');
});

test('legacy hashes redirect to one canonical destination', async ({page}) => {
    const cases: Array<[string, RegExp]> = [
        ['#inbox', /#\/notes\?capture=1/],
        ['#network', /#\/notes\?explore=1/],
        ['#connections', /#\/notes\?explore=1/],
        ['#actions', /#\/notes\?mode=board/],
        ['#map', /#\/notes\?mode=map/],
        ['#timeline', /#\/notes\?mode=timeline/],
        ['#trash', /#\/notes\?filter=trash/],
        ['#labels', /#\/settings\/labels/],
        ['#ontology', /#\/settings\/ontology/],
        ['#skills', /#\/settings\/skills/],
    ];

    await seed(page, {notes: demoNotes(), settings: defaultSettings()});
    for (const [hash, expected] of cases) {
        await open(page, hash);
        await expect.poll(() => page.evaluate(() => window.location.hash)).toMatch(expected);
    }
});

test('reply to a note from the context rail', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes/demo-request-react?tab=replies'});

    const rail = page.getByRole('complementary', {name: 'Note context'});
    await expect(rail.getByTestId('note-replies')).toBeVisible();
    const input = rail.getByLabel('Write a reply');
    await input.fill('I can help this week.');
    await input.press('Enter');
    await expect(rail.getByText('I can help this week.')).toBeVisible();
});
