import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings} from '../fixtures/workspace';

const addDetail = async (page: Page, key: string, value: string) => {
    await page.getByTestId('add-detail').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('e.g. status, price, deadline').fill(key);

    const valueSelect = dialog.locator('select').nth(1);
    if (await valueSelect.count()) {
        await valueSelect.selectOption({label: value});
    } else {
        await dialog.locator('input').nth(1).fill(value);
    }

    await dialog.getByRole('button', {name: 'Add detail'}).click();
    await expect(dialog).toBeHidden();
};

const createNote = async (page: Page, title: string) => {
    await page.getByTitle(/New Note/).click();
    const titleInput = page.getByPlaceholder('Untitled Note');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
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

        await createNote(page, 'React developer available');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '1200');
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');

        await page.evaluate(() => {
            window.location.hash = '#dashboard';
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        const match = page.getByTestId('local-match');
        await expect(match).toBeVisible({timeout: 20_000});
        await expect(match).toContainText('satisfied');

        // Step 3 of the golden path: the explanation is the honesty surface.
        await match.getByTestId('match-explanations').locator('summary').click();
        await expect(match.getByText('Why it fits')).toBeVisible();
    });

    test('match explanation shows satisfied and conflicting constraints', async ({page}) => {
        await seed(page, {notes: [], settings: defaultSettings()});

        await createNote(page, 'Looking for a React developer');
        await addDetail(page, 'intent', 'request');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '800');
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');

        await createNote(page, 'React developer available');
        await addDetail(page, 'skill', 'React');
        await addDetail(page, 'rate', '500'); // Conflicts with rate >= 800
        await addDetail(page, 'stack', 'TypeScript');
        await addDetail(page, 'timezone', 'UTC');
        await addDetail(page, 'language', 'English');

        await page.evaluate(() => {
            window.location.hash = '#dashboard';
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        const match = page.getByTestId('local-match');
        await expect(match).toBeVisible({timeout: 20_000});
        
        await match.getByTestId('match-explanations').locator('summary').click();
        await expect(match.getByText('Why it fits')).toBeVisible();
        
        // Should show both satisfied and conflicting constraints
        await expect(match.getByText(/conflicting/i)).toBeVisible();
    });
});