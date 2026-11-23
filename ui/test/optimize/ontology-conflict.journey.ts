import { test, expect } from '@playwright/test';
import { runJourneyTest } from './support/journeyTest';
test('optimize: ontology-conflict', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    await runJourneyTest('ontology-conflict', page);
});
