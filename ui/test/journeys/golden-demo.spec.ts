import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, demoNotes} from '../fixtures/workspace';

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

test('sample workspace shows explained match for React developer', async ({page}) => {
    const aiRequests = trackAiRequests(page);
    await seed(page, {notes: demoNotes(), settings: defaultSettings()});

    // Navigate to dashboard
    await page.evaluate(() => {
        window.location.hash = '#dashboard';
        window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Wait for match to appear
    const match = page.getByTestId('local-match');
    await expect(match).toBeVisible({timeout: 20_000});

    // Verify it's the React developer match
    await expect(match).toContainText('Looking for a React developer');
    await expect(match).toContainText('React developer available');

    // Open match explanations
    const detailsSummary = match.getByTestId('match-explanations').locator('summary');
    await expect(detailsSummary).toBeVisible();
    await detailsSummary.click();

    // Verify explanation details are visible with reasons
    await expect(match.getByText('Why it fits')).toBeVisible();
    await expect(match.getByText('skill')).toBeVisible();
    await expect(match.getByText('React')).toBeVisible();
    await expect(match.getByText('Exact match')).toBeVisible();

    // Verify rate comparison shows units (USD/project)
    await expect(match.getByText('USD/project')).toBeVisible();

    expect(aiRequests).toEqual([]);
});