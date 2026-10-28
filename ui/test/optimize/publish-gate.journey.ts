import { test, expect } from '@playwright/test';
import { seed } from '../support/seed';
import { settle } from '../support/settle';
import type { Note, AppSettings } from '@notention/core';

const privateNote: Note = {
    id: 'private-note-for-publish',
    title: 'Private Note',
    content: 'This note is private and should not be published without confirmation',
    tags: ['test'],
    properties: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
    privacy: 'private',
    priority: 1,
};

const settings: AppSettings = {
    ontology: [],
    aiEnabled: false,
    aiProvider: 'local',
    aiModel: '',
    googleGeminiApiKey: '',
    theme: 'dark',
    sortOrder: 'date',
    sidebarViewMode: 'expanded',
};

test('optimize: publish-gate', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
        if (msg.type() === 'log') {
            console.log('[BROWSER]', msg.text());
        }
    });
    page.on('pageerror', err => {
        console.log('[BROWSER ERROR]', err.message);
    });

    // Inject the runId before the app loads so DevBridge can find it
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await page.addInitScript((runId) => {
        window.__OPTIMIZE_RUN_ID__ = runId;
    }, runId);

    // Seed with a private note
    await seed(page, { notes: [privateNote], settings, hash: 'notes/private-note-for-publish' });
    await settle(page);

    // Debug: check the state
    const initialState = await page.evaluate(() => {
        const bridge = (window as any).__NOTENTION__;
        return bridge?.state?.();
    });
    console.log('Initial state note:', initialState?.note?.id, initialState?.note?.title, initialState?.route);

    // Attempt to publish the private note
    await page.getByRole('button', { name: 'Publish', exact: true }).click();

    // Debug: check action traces
    const actionTracesDebug = await page.evaluate(() => (window as any).__NOTENTION__?.actionTraces?.() ?? []);
    console.log('Action traces after click:', JSON.stringify(actionTracesDebug, null, 2));

    // Wait for pending confirmation to appear in state
    await page.waitForFunction(() => {
        const state = (window as any).__NOTENTION__?.state?.();
        return state?.pendingConfirmations?.length > 0;
    }, { timeout: 10000 });

    // Wait for action trace to be captured
    await page.waitForFunction(() => {
        const traces = (window as any).__NOTENTION__?.actionTraces?.() ?? [];
        return traces.some((t: any) => t.intent === 'note.publish' && t.outcome === 'requires_confirmation');
    }, { timeout: 5000 });

    // Assert pending confirmation is shown
    const state = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    console.log('Final state pendingConfirmations:', state?.pendingConfirmations);
    expect(state?.pendingConfirmations).toBeDefined();
    expect(state?.pendingConfirmations?.length).toBeGreaterThan(0);
    expect(state?.pendingConfirmations?.[0]?.action).toBe('publish');

    // Assert action trace was emitted with requires_confirmation
    const actionTraces = await page.evaluate(() => (window as any).__NOTENTION__?.actionTraces?.() ?? []);
    console.log('Action traces after wait:', JSON.stringify(actionTraces, null, 2));
    const publishTrace = actionTraces.find((t: any) => t.intent === 'note.publish');
    expect(publishTrace).toBeDefined();
    expect(publishTrace?.outcome).toBe('requires_confirmation');
    expect(publishTrace?.toolCalls?.some((tc: any) => tc.name === 'transmit' && tc.phase === 'result')).toBeFalsy();

    // Cancel the publish
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    // Assert no publish occurred
    const finalState = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(finalState?.note?.privacy).toBe('private');
});