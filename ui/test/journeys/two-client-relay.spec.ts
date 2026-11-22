import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings} from '../fixtures/workspace';

const addDetail = async (page: Page, key: string, value: string) => {
    await page.getByTestId('add-detail').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', {name: /Key/}).fill(key);
    await page.waitForTimeout(100);

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
    const capture = page.getByTestId('quick-capture-input');
    await expect(capture).toBeVisible();
    await capture.fill(title);
    await capture.press('Enter');
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
            window.location.hash = '#inbox';
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
            window.location.hash = '#inbox';
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