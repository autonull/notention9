import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings} from '../fixtures/workspace';

const AI_HOSTS = /generativelanguage\.googleapis\.com|huggingface\.co|mlc\.ai|openai\.com|anthropic\.com/;

const trackAiRequests = (page: Page): string[] => {
    const requests: string[] = [];
    page.on('request', request => {
        if (AI_HOSTS.test(request.url())) requests.push(request.url());
    });
    return requests;
};

const createNote = async (page: Page, title: string) => {
    await page.getByTitle('New Note').click();
    const titleInput = page.getByPlaceholder('Untitled Note');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
};

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

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('a request and an offer composed through the popup match each other', async ({page}) => {
    const aiRequests = trackAiRequests(page);
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

    const editorText = await page.locator('.ProseMirror').innerText();
    expect(editorText).not.toContain('[');
    expect(editorText).not.toContain(']');

    await page.evaluate(() => {
        window.location.hash = '#dashboard';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 20_000});
    await expect(match).toContainText('4 satisfied · 1 conflicting');

    expect(aiRequests).toEqual([]);
});
