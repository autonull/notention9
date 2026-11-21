import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {readFrictionJournal, waitForFrictionEvent} from '../support/journal';
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

const addDetail = async (page: Page, key: string, value: string) => {
    await page.getByTestId('add-detail').click();
    const dialog = page.getByRole('dialog');
    // Key input has placeholder "Key (e.g. price)"
    await dialog.getByPlaceholder('Key (e.g. price)').fill(key);
    // Wait for attribute to be recognized
    await page.waitForTimeout(300);

    // Handle known enum keys (intent) - they use a native select for value
    const enumKeys = ['intent'];
    if (enumKeys.includes(key)) {
        // The value select for enum is a native select with the enum options
        // It's the second select in the dialog (first is operator Select)
        const valueSelect = dialog.locator('select').nth(1);
        await valueSelect.selectOption({label: value});
    } else {
        // For non-enum keys, try number input first (for rate)
        const numberInput = dialog.locator('input[type="number"]').first();
        if (await numberInput.count()) {
            await numberInput.fill(value);
        } else {
            // String input (skill, stack, timezone, language, etc.)
            await dialog.getByPlaceholder('e.g. Active, 100, 2024-01-01').fill(value);
        }
    }

    const save = dialog.getByRole('button', {name: /Add detail|Save/});
    await save.waitFor({state: 'visible'});
    await save.click();
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

    // Wait for notes to be persisted
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
        window.location.hash = '#inbox';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 20_000});
    // InboxView shows score percentage (e.g., "60%")
    await expect(match).toContainText(/\d+%/);

    // Step 3 of the golden path: the explanation is the honesty surface.
    await match.getByTestId('match-explanations').locator('summary').click();
    await expect(match.getByText('Why this match?')).toBeVisible();

    expect(aiRequests).toEqual([]);
});

test('the journey records the time-to-first-match anchors', async ({page}) => {
    await seed(page, {notes: [], settings: defaultSettings()});

    await createNote(page, 'Looking for a React developer');
    await addDetail(page, 'intent', 'request');
    await addDetail(page, 'skill', 'React');
    await addDetail(page, 'stack', 'TypeScript');

    await createNote(page, 'React developer available');
    await addDetail(page, 'skill', 'React');
    await addDetail(page, 'stack', 'TypeScript');

    await page.evaluate(() => {
        window.location.hash = '#inbox';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 20_000});
    await match.getByTestId('match-explanations').locator('summary').click();
    // Verify the explanation panel opens
    await expect(match.getByText('Why this match?')).toBeVisible();

    const expressed = await waitForFrictionEvent(page, 'need_expressed');
    const explained = await waitForFrictionEvent(page, 'match_explained');

    expect(expressed.noteId).toBeTruthy();
    expect(explained.noteId).toBe(expressed.noteId);
    expect(expressed.sessionId).toBeTruthy();
    expect(explained.sessionId).toBe(expressed.sessionId);
    expect(new Date(explained.timestamp!).getTime())
        .toBeGreaterThanOrEqual(new Date(expressed.timestamp!).getTime());

    const journal = await readFrictionJournal(page);
    expect(journal.some(event => event.kind === 'need_expressed')).toBe(true);
});