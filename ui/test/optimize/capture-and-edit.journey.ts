import { test, expect } from '@playwright/test';
import { seed } from '../support/seed';
import { settle } from '../support/settle';
import type { Note, AppSettings } from '@notention/core';

const testNote: Note = {
    id: 'scene-editor-note',
    title: 'Scene Editor Note',
    content: 'Working on the scene editor with React and TypeScript',
    tags: ['development'],
    properties: [
        { key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] },
    ],
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

test('optimize: capture-and-edit', async ({ page }) => {
    // Seed
    await seed(page, { notes: [testNote], settings, hash: 'notes/scene-editor-note' });
    await settle(page);

    // Debug: check what the state actually contains
    const debugState = await page.evaluate(() => {
        const bridge = (window as any).__NOTENTION__;
        const state = bridge?.state?.();
        return {
            hasBridge: !!bridge,
            stateKeys: state ? Object.keys(state) : null,
            note: state?.note,
            route: state?.route,
            loading: (window as any).__NOTENTION__?.loading,
        };
    });
    console.log('Debug state:', JSON.stringify(debugState, null, 2));

    // Assert initial state
    const state = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(state?.note?.propertyIndex?.skill).toContain('React');
    expect(state?.note?.propertyIndex?.skill).toContain('TypeScript');

    // Open property palette and add a detail
    await page.getByRole('button', { name: /add property/i }).click();
    await page.getByRole('textbox', { name: /property key/i }).fill('framework');
    await page.getByRole('textbox', { name: /property value/i }).fill('Next.js');
    await page.getByRole('button', { name: /add/i }).click();

    // Assert property was added
    const updatedState = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(updatedState?.note?.propertyIndex?.framework).toContain('Next.js');

    // Assert editor text has no brackets (clean content)
    const editorContent = await page.locator('[data-testid="editor"]').textContent();
    expect(editorContent).not.toContain('[');
    expect(editorContent).not.toContain(']');

    // Reload and assert persistence
    await page.reload();
    await settle(page);

    const persistedState = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(persistedState?.note?.propertyIndex?.skill).toContain('React');
    expect(persistedState?.note?.propertyIndex?.skill).toContain('TypeScript');
    expect(persistedState?.note?.propertyIndex?.framework).toContain('Next.js');

    // Assert no console errors
    const consoleErrors = await page.evaluate(() => (window as any).__NOTENTION__?.console?.filter((c: any) => c.type === 'error') ?? []);
    expect(consoleErrors).toHaveLength(0);
});