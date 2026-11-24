import { test } from '@playwright/test';
import { runJourneyTest } from './support/journeyTest';

test('optimize: capture-and-edit-palette', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    await runJourneyTest('capture-and-edit-palette', page);
});
