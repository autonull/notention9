import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property, Note} from '../fixtures/workspace';

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z').getTime();

// Job request note without budget - should trigger "Add budget" suggestion via rules
const jobRequestNote = (): Note => ({
    id: 'scene-job-request-note',
    title: 'Frontend developer needed',
    content: '<p>Looking for a React developer for a two-week project. Remote work preferred.</p>',
    tags: ['request', 'work'],
    properties: [
        property('type', ['work/job-request']),
        property('role', ['frontend developer']),
        property('remote', ['true'])
    ],
    createdAt: new Date(FIXED_NOW - 2 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 1800_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.8,
});

// Note with multiple triggers - should show multiple next steps
const multiTriggerNote = (): Note => ({
    id: 'scene-multi-trigger-note',
    title: 'Urgent remote job - no budget or deadline',
    content: '<p>Urgent React developer needed. Remote work preferred.</p>',
    tags: ['request', 'work', 'urgent'],
    properties: [
        property('type', ['work/job-request', 'request/need-request']),
        property('role', ['developer']),
        property('priority', ['urgent']),
        property('remote', ['true']),
        property('task', ['web development'])
    ],
    createdAt: new Date(FIXED_NOW - 1 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 300_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 1.0,
});

// Simple note with no matching rules - empty state
const simpleNote = (): Note => ({
    id: 'scene-simple-note',
    title: 'Just a thought',
    content: '<p>Thinking about the weekend.</p>',
    tags: ['note'],
    properties: [],
    createdAt: new Date(FIXED_NOW).toISOString(),
    updatedAt: new Date(FIXED_NOW).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0,
});

// Note matching skill patterns - should trigger fulfillment hint
const skillMatchedNote = (): Note => ({
    id: 'scene-skill-matched-note',
    title: 'Web scraping task',
    content: '<p>Need someone to scrape product data from 50 e-commerce sites. Python preferred.</p>',
    tags: ['request', 'task'],
    properties: [
        property('type', ['request/need-request']),
        property('task', ['web scraping']),
        property('role', ['developer'])
    ],
    createdAt: new Date(FIXED_NOW - 4 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 2 * 3600_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.6,
});

// Offer note for matching
const skillOfferNote = (): Note => ({
    id: 'scene-skill-offer-note',
    title: 'Python developer available',
    content: '<p>Experienced Python developer available for web scraping and data extraction projects.</p>',
    tags: ['offer', 'skill'],
    properties: [
        property('type', ['offer/skill-offer']),
        property('skill', ['python']),
        property('contact', ['dev@example.com'])
    ],
    createdAt: new Date(FIXED_NOW - 3 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 1800_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.7,
});

async function seedAppliedState(page: any, noteId: string) {
    await page.evaluate(async (id: string) => {
        const now = Date.now();
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open('notention:next-steps:v1');
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains('nextSteps')) {
                    req.result.createObjectStore('nextSteps');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const tx = db.transaction('nextSteps', 'readwrite');
        tx.objectStore('nextSteps').put({
            version: 1,
            noteId: id,
            contentHash: `seeded-${id}`,
            generationId: 'seed',
            active: [],
            stale: [],
            suppressed: [],
            updatedAt: now,
            applied: [{
                suggestion: {
                    id: 'applied-budget',
                    noteId: id,
                    kind: 'add-property',
                    status: 'applied',
                    title: 'Add budget',
                    description: 'Job requests should indicate a budget range',
                    evidence: [{source: 'rules', ruleId: 'rule-add-budget-for-job', confidence: 1}],
                    proposedChange: {type: 'add', property: {key: 'budget', operator: 'gte', values: ['1000']}, placeholder: ''},
                    createdAt: now - 1000,
                    updatedAt: now - 1000,
                    appliedAt: now,
                    generationId: 'seed',
                },
                appliedAt: now,
                resultNoteIds: [id],
                fitCount: 2,
            }],
        }, `notention:next-steps:v1:${id}`);
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }, noteId);
}

async function seedStaleState(page: any, note: any) {
    const contentHash = `${note.content}|${note.properties.map((p: any) => `${p.key}:${p.operator}:${p.values.join(',')}`).sort().join(';')}|${[...note.tags].sort().join(',')}`;
    await page.evaluate(async ({id, hash}: {id: string; hash: string}) => {
        const now = Date.now();
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open('notention:next-steps:v1');
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains('nextSteps')) {
                    req.result.createObjectStore('nextSteps');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const tx = db.transaction('nextSteps', 'readwrite');
        tx.objectStore('nextSteps').put({
            version: 1,
            noteId: id,
            contentHash: hash,
            generationId: 'seed',
            active: [],
            stale: [{
                id: 'stale-budget',
                noteId: id,
                kind: 'add-property',
                status: 'stale',
                title: 'Add budget',
                description: 'Job requests should indicate a budget range',
                evidence: [{source: 'rules', ruleId: 'rule-add-budget-for-job', confidence: 1}],
                proposedChange: {type: 'add', property: {key: 'budget', operator: 'gte', values: ['1000']}, placeholder: ''},
                createdAt: now - 1000,
                updatedAt: now - 1000,
                generationId: 'seed',
            }],
            suppressed: [],
            updatedAt: now,
            applied: [],
        }, `notention:next-steps:v1:${id}`);
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }, {id: note.id, hash: contentHash});
}

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

// ============================================================================
// Empty state
// ============================================================================
test('next-steps: empty state when no triggers', async ({page}) => {
    await seed(page, {
        notes: [simpleNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-simple-note'
    });
    // Wait for next steps strip to load
    await page.waitForSelector('[data-testid="editor-content"]', {timeout: 15_000});
    await snap(page, {
        area: 'next-steps',
        state: 'empty',
        description: 'A note with no triggers stays quiet: no empty next-steps chrome.',
    });
});

// ============================================================================
// Single next step
// ============================================================================
test('next-steps: single next step (add budget)', async ({page}) => {
    await seed(page, {
        notes: [jobRequestNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-job-request-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
    await snap(page, {
        area: 'next-steps',
        state: 'single',
        description: 'Job request note triggers single "Add budget" next step via deterministic rules.',
    });
});

// ============================================================================
// Multiple next steps
// ============================================================================
test('next-steps: multiple next steps', async ({page}) => {
    await seed(page, {
        notes: [multiTriggerNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-multi-trigger-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
    await snap(page, {
        area: 'next-steps',
        state: 'multiple',
        description: 'Note with multiple triggers shows multiple next step cards (Add budget, Add deadline, Fulfillment hint).',
    });
});

// ============================================================================
// Applied history
// ============================================================================
test('next-steps: applied history shows result links and fit count', async ({page}) => {
    await seed(page, {
        notes: [multiTriggerNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-multi-trigger-note'
    });
    await seedAppliedState(page, 'scene-multi-trigger-note');
    await page.reload();
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});

    // Open drawer to see applied history (multiTriggerNote has multiple steps)
    await page.locator('button[aria-label^="Open next steps"]').first().click();
    await page.waitForSelector('[data-testid="next-steps-drawer"]', {timeout: 5_000});
    await page.locator('summary:has-text("Applied history")').click();

    await snap(page, {
        area: 'next-steps',
        state: 'applied',
        description: 'Applied history opens on demand, with fit count and undo.',
    });
});

// ============================================================================
// Stale state after edit
// ============================================================================
test('next-steps: stale state after edit', async ({page}) => {
    const note = jobRequestNote();
    await seed(page, {
        notes: [note],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-job-request-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await seedStaleState(page, note);
    await page.reload();
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.waitForSelector('[data-testid^="next-step-card-"]', {timeout: 10_000});

    await snap(page, {
        area: 'next-steps',
        state: 'stale',
        description: 'A suggestion from before an edit stays visible with a Refresh action, instead of disappearing.',
    });
});

// ============================================================================
// Zero match (has suggestions but no matching offers)
// ============================================================================
test('next-steps: zero match state', async ({page}) => {
    await seed(page, {
        notes: [multiTriggerNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-multi-trigger-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
    
    // Open drawer to see matches section (should be empty)
    await page.locator('button[aria-label^="Open next steps"]').first().click();
    await page.waitForSelector('[data-testid="next-steps-drawer"]', {timeout: 5_000});
    
    await snap(page, {
        area: 'next-steps',
        state: 'zero-match',
        description: 'The drawer keeps suggestions and history separate from the note, even with no matches.',
    });
});

// ============================================================================
// Mobile view
// ============================================================================
test('next-steps: mobile view', async ({page}) => {
    await page.setViewportSize({width: 375, height: 667});
    await seed(page, {
        notes: [jobRequestNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-job-request-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
    await snap(page, {
        area: 'next-steps',
        state: 'mobile',
        viewport: 'mobile',
        description: 'Next steps strip on mobile viewport shows single card with touch-friendly targets.',
    });
});

// ============================================================================
// Drawer opened from strip
// ============================================================================
test('next-steps: drawer opened from strip', async ({page}) => {
    await seed(page, {
        notes: [multiTriggerNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-multi-trigger-note'
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
    
    // Click the drawer open button (shows when multiple steps)
    await page.locator('button[aria-label^="Open next steps"]').first().click();
    
    // Wait for drawer to open
    await page.waitForSelector('[data-testid="next-steps-drawer"]', {timeout: 5_000});
    
    await snap(page, {
        area: 'next-steps',
        state: 'drawer-open',
        description: 'Next steps drawer opens showing all steps with sections for active, applied history, and matches.',
    });
});