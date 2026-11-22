import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {settleFrame} from '../support/settle';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings} from '../fixtures/workspace';

const addDetail = async (page: Page, key: string, value: string) => {
    await page.getByTestId('page-add-detail').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', {name: /Key/}).fill(key);
    await settleFrame(page);

    const valueSelect = dialog.locator('select').nth(1);
    if (await valueSelect.count()) {
        await valueSelect.selectOption({label: value});
    } else {
        await dialog.locator('input').nth(1).fill(value);
    }

    const save = dialog.getByRole('button', {name: 'Add detail'});
    await save.waitFor({state: 'visible'});
    await save.click();
    await expect(dialog).toBeHidden();
};

const createNote = async (page: Page, title: string) => {
    await page.evaluate(() => {
        window.location.hash = '#inbox';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByRole('button', {name: 'New note'}).first().click();
    const titleInput = page.locator('#note-title-input');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
};

const saveNote = async (page: Page) => {
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Saved', {exact: true})).toBeVisible();
};

test.describe('Local matching journey (two-note matching)', () => {
    test.beforeEach(async ({page}) => {
        await isolateNetwork(page);
    });

    test('a request and an offer composed through the popup match each other', async ({page}) => {
        await seed(page, {notes: [], settings: defaultSettings()});

        await createNote(page, 'Looking for a React developer');
        await addDetail(page, 'intent', 'request');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '800');
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');
        await saveNote(page);

        await createNote(page, 'React developer available');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '1200');
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');

        await saveNote(page);
        await page.evaluate(() => {
            window.location.hash = '#/notes';
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        await page.getByTestId('note-history-rail').getByRole('button', {name: /Looking for a React developer/}).click();
        const rail = page.getByRole('complementary', {name: 'Note context'});
        await rail.getByRole('tab', {name: 'Matches'}).click();
        const match = page.getByTestId('note-matches').getByTestId('match-item').first();
        await expect(match).toBeVisible({timeout: 20_000});
        await expect(match).toContainText('React developer available');
    });

    test('match item lists satisfied and missing constraints', async ({page}) => {
        await seed(page, {notes: [], settings: defaultSettings()});

        await createNote(page, 'Looking for a React developer');
        await addDetail(page, 'intent', 'request');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '800');
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');
        await saveNote(page);

        await createNote(page, 'React developer available');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '500'); // Conflicts with rate >= 800
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');

        await saveNote(page);
        await page.evaluate(() => {
            window.location.hash = '#/notes';
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        await page.getByTestId('note-history-rail').getByRole('button', {name: /Looking for a React developer/}).click();
        const rail = page.getByRole('complementary', {name: 'Note context'});
        await rail.getByRole('tab', {name: 'Matches'}).click();
        const match = page.getByTestId('note-matches').getByTestId('match-item').first();
        await expect(match).toBeVisible({timeout: 20_000});
        await expect(match).toContainText('Missing: rate');
    });
});