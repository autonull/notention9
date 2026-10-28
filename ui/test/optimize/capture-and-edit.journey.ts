import { test, expect } from '@playwright/test';
import { runJourneyTest } from './support/journeyTest';

test('optimize: capture-and-edit', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    await runJourneyTest('capture-and-edit', page);
});

test('optimize: capture-and-edit-keyboard', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    await runJourneyTest('capture-and-edit-keyboard', page);
});