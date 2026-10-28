import { test, expect } from '@playwright/test';
import { runJourneyTest } from './support/journeyTest';

test('optimize: golden-path', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    await runJourneyTest('golden-path', page);
});