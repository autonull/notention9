import {test, expect} from '@playwright/test';
import {generateSecretKey} from 'nostr-tools';
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

    await page.getByRole('button', {name: 'New note'}).first().click();

    const title = page.locator('#note-title-input');
    await expect(title).toBeVisible();
    await title.fill('Looking for a React developer #request');

    const editor = page.locator('[contenteditable="true"]');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Looking for a React developer #request');

    const rail = page.getByRole('complementary', {name: 'Note context'});
    if (!(await rail.isVisible())) await page.getByRole('button', {name: /Context/}).click();
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('tab', {name: 'Next'})).toHaveAttribute('aria-selected', 'true');
});

test('respond to a match from the note context rail', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}), hash: '#/notes/demo-request-react?tab=matches'});

    const rail = page.getByRole('complementary', {name: 'Note context'});
    if (!(await rail.isVisible())) await page.getByRole('button', {name: /Context/}).click();
    await expect(rail).toBeVisible();
    await expect(page.getByTestId('note-matches')).toBeVisible();
    await rail.getByRole('button', {name: /Respond/}).first().click();

    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
    await expect(page.locator('#note-title-input')).toHaveValue(/^Re: /);
});

test('one search overlay finds notes and commands', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}), hash: '#/notes'});
    await page.keyboard.press('Control+K');

    const dialog = page.getByRole('dialog', {name: 'Search'});
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Search notes, details, tags, and commands…').fill('React');
    await expect(dialog.getByText('Looking for a React developer').first()).toBeVisible();
});

test('arrow previews a note without leaving the one overlay', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});
    await page.keyboard.press('Control+K');

    const dialog = page.getByRole('dialog', {name: 'Search'});
    await dialog.getByPlaceholder('Search notes, details, tags, and commands…').fill('React');
    await expect(dialog.getByText('Looking for a React developer').first()).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('complementary', {name: 'Note preview'})).toBeVisible();
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('complementary', {name: 'Note preview'})).toHaveCount(0);
    await expect(dialog).toBeVisible();
});

test('light theme applies to the workspace', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings({theme: 'light'}), hash: '#/notes'});

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.locator('[data-ready]').evaluate(element => getComputedStyle(element).backgroundColor))
        .toBe('rgb(246, 246, 243)');
});

test('the top bar has one entry and no Inbox or Connections tabs', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}), hash: '#/notes'});

    const header = page.locator('header').first();
    await expect(header.getByRole('button', {name: /Inbox|Connections|Network/})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'New note'})).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'Search notes, details, tags, and commands'})).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'Settings'})).toHaveCount(1);
});

test('settings deep link opens the named tab', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}), hash: '#/settings/skills'});

    await expect(page.getByRole('heading', {name: 'Settings', exact: true})).toBeVisible();
    await expect(page.getByRole('tabpanel', {name: 'Skills'})).toBeVisible();
    await expect(page.getByRole('tab', {name: 'Skills'})).toHaveAttribute('aria-selected', 'true');
});

test('chat and public notes stay reachable from the one overlay', async ({page}) => {
    await seed(page, {
        notes: demoNotes(),
        settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}),
        hash: '#chat',
    });

    const dialog = page.getByRole('dialog', {name: 'Search'});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', {name: 'Chat'})).toHaveAttribute('aria-pressed', 'true');

    await dialog.getByRole('button', {name: 'Explore public notes'}).click();
    await expect(dialog.getByText(/No network notes found|Connect an identity/)).toBeVisible({timeout: 15_000});
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
    await seed(page, {notes: demoNotes(), settings: defaultSettings({nostr: {privkey: Buffer.from(generateSecretKey()).toString('hex'), relays: ['ws://localhost:7000']}}), hash: '#/notes/demo-request-react?tab=replies'});

    const rail = page.getByRole('complementary', {name: 'Note context'});
    if (!(await rail.isVisible())) await page.getByRole('button', {name: /Context/}).click();
    await expect(rail.getByTestId('note-replies')).toBeVisible();
    const input = rail.getByLabel('Write a reply');
    await input.fill('I can help this week.');
    await input.press('Enter');
    await expect(rail.getByText('I can help this week.')).toBeVisible();
});
