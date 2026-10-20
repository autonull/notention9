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

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('describe it proposes details that only reach the note when accepted', async ({page}) => {
    const aiRequests = trackAiRequests(page);
    await seed(page, {notes: [], settings: defaultSettings()});

    await page.getByTitle('New Note').click();
    await expect(page.getByPlaceholder('Untitled Note')).toBeVisible();

    await page.getByTestId('describe-it').click();
    const composer = page.getByRole('dialog');

    await composer.getByTestId('describe-it-input').fill('Looking for a React developer, budget under 900 USD');
    await composer.getByTestId('describe-it-suggest').click();

    const suggestions = composer.getByTestId('describe-it-suggestion');
    await expect(suggestions.first()).toBeVisible();

    await suggestions.first().getByTestId('describe-it-accept').click();
    await composer.getByTestId('describe-it-apply').click();
    await expect(composer).toBeHidden();

    await expect(page.locator('.ProseMirror .node-property').first()).toBeVisible();

    const editorText = await page.locator('.ProseMirror').innerText();
    expect(editorText).not.toContain('[');
    expect(editorText).not.toContain(']');

    expect(aiRequests).toEqual([]);
});
