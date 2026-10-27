import { test, expect } from '@playwright/test';
import { seed, settle } from '../support/seed';
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
    // Seed with a private note
    await seed(page, { notes: [privateNote], settings, hash: 'notes/private-note-for-publish' });
    await settle(page);

    // Attempt to publish the private note
    await page.getByRole('button', { name: /publish/i }).click();

    // Assert pending confirmation is shown
    const state = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(state?.pendingConfirmations).toBeDefined();
    expect(state?.pendingConfirmations?.length).toBeGreaterThan(0);
    expect(state?.pendingConfirmations?.[0]?.action).toBe('publish');

    // Assert action trace was emitted with requires_confirmation
    const actionTraces = await page.evaluate(() => (window as any).__NOTENTION__?.actionTraces?.() ?? []);
    const publishTrace = actionTraces.find((t: any) => t.intent === 'note.publish');
    expect(publishTrace).toBeDefined();
    expect(publishTrace?.outcome).toBe('requires_confirmation');
    expect(publishTrace?.toolCalls?.some((tc: any) => tc.name === 'transmit' && tc.phase === 'result')).toBeFalsy();

    // Cancel the publish
    await page.getByRole('button', { name: /cancel/i }).click();

    // Assert no publish occurred
    const finalState = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(finalState?.note?.privacy).toBe('private');
});