import { test, expect } from '@playwright/test';
import { seed } from '../support/seed';
import { settle } from '../support/settle';
import type { Note, AppSettings } from '@notention/core';

const conflictingNote: Note = {
    id: 'ontology-conflict-note',
    title: 'Ontology Conflict Note',
    content: 'This note has properties that conflict with ontology definitions',
    tags: ['test'],
    properties: [
        { key: 'status', operator: 'is', values: ['pending'] },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
    privacy: 'private',
    priority: 1,
};

const settings: AppSettings = {
    ontology: [
        {
            id: 'task',
            label: 'Task',
            attributes: {
                status: { type: 'enum', operators: { real: ['is', 'is not'], imaginary: [] } },
            },
        },
    ],
    aiEnabled: false,
    aiProvider: 'local',
    aiModel: '',
    googleGeminiApiKey: '',
    theme: 'dark',
    sortOrder: 'date',
    sidebarViewMode: 'expanded',
};

test('optimize: ontology-conflict', async ({ page }) => {
    // Seed with a note that has ontology conflict
    await seed(page, { notes: [conflictingNote], settings, hash: 'notes/ontology-conflict-note' });
    await settle(page);

    // Assert initial state
    const state = await page.evaluate(() => (window as any).__NOTENTION__?.state?.());
    expect(state?.note).toBeDefined();
    expect(state?.note?.propertyIndex?.status).toContain('pending');

    // TODO: Add more steps to test ontology conflict resolution
    // This is a draft journey - only seed and first assertion implemented
});