import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property, Note} from '../fixtures/workspace';

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z').getTime();

const jobRequestNote = (): Note => ({
    id: 'a11y-job-request',
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
    source: {type: 'user', identifier: 'a11y', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.8,
});

const multiTriggerNote = (): Note => ({
    id: 'a11y-multi-trigger',
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
    source: {type: 'user', identifier: 'a11y', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 1.0,
});

const simpleNote = (): Note => ({
    id: 'a11y-simple-note',
    title: 'Just a thought',
    content: '<p>Thinking about the weekend.</p>',
    tags: ['note'],
    properties: [],
    createdAt: new Date(FIXED_NOW).toISOString(),
    updatedAt: new Date(FIXED_NOW).toISOString(),
    source: {type: 'user', identifier: 'a11y', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0,
});

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test.describe('axe: Next Steps Strip', () => {
    test('no critical violations - single next step', async ({page}) => {
        await seed(page, {
            notes: [jobRequestNote()],
            settings: defaultSettings({aiEnabled: false, developerMode: true}),
            hash: '#notes/a11y-job-request',
        });

        await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});

        const results = await new AxeBuilder({page})
            .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
            .analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');

        if (critical.length > 0) {
            console.log('\n=== Next Steps Strip (single) critical violations ===');
            for (const v of critical) {
                console.log(`  [CRITICAL] ${v.id}: ${v.description}`);
                console.log(`    Help: ${v.helpUrl}`);
                console.log(`    Nodes: ${v.nodes.length}`);
                for (const node of v.nodes.slice(0, 3)) {
                    console.log(`      - ${node.html}`);
                }
            }
        }

        expect(critical.length, 'Critical violations on Next Steps Strip (single)').toBe(0);
    });

    test('no critical violations - multiple next steps', async ({page}) => {
        await seed(page, {
            notes: [multiTriggerNote()],
            settings: defaultSettings({aiEnabled: false, developerMode: true}),
            hash: '#notes/a11y-multi-trigger',
        });

        await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});

        const results = await new AxeBuilder({page})
            .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
            .analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');

        if (critical.length > 0) {
            console.log('\n=== Next Steps Strip (multiple) critical violations ===');
            for (const v of critical) {
                console.log(`  [CRITICAL] ${v.id}: ${v.description}`);
                console.log(`    Help: ${v.helpUrl}`);
                console.log(`    Nodes: ${v.nodes.length}`);
                for (const node of v.nodes.slice(0, 3)) {
                    console.log(`      - ${node.html}`);
                }
            }
        }

        expect(critical.length, 'Critical violations on Next Steps Strip (multiple)').toBe(0);
    });

    test('no critical violations - quiet empty state', async ({page}) => {
        await seed(page, {
            notes: [simpleNote()],
            settings: defaultSettings({aiEnabled: false, developerMode: true}),
            hash: '#notes/a11y-simple-note',
        });

        await page.waitForSelector('[data-testid="editor-content"]', {timeout: 15_000});
        await expect(page.locator('[data-testid="next-step-strip"]')).toHaveCount(0);

        const results = await new AxeBuilder({page})
            .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
            .analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');

        if (critical.length > 0) {
            console.log('\n=== Next Steps Strip (empty) critical violations ===');
            for (const v of critical) {
                console.log(`  [CRITICAL] ${v.id}: ${v.description}`);
                console.log(`    Help: ${v.helpUrl}`);
                console.log(`    Nodes: ${v.nodes.length}`);
                for (const node of v.nodes.slice(0, 3)) {
                    console.log(`      - ${node.html}`);
                }
            }
        }

        expect(critical.length, 'Critical violations on Next Steps Strip (empty)').toBe(0);
    });
});

test.describe('axe: Next Steps Drawer', () => {
    test('no critical violations - drawer open', async ({page}) => {
        await seed(page, {
            notes: [multiTriggerNote()],
            settings: defaultSettings({aiEnabled: false, developerMode: true}),
            hash: '#notes/a11y-multi-trigger',
        });

        await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
        
        // Open drawer
        await page.locator('button[aria-label^="Open next steps"]').first().click();
        await page.waitForSelector('[data-testid="next-steps-drawer"]', {timeout: 5_000});

        const results = await new AxeBuilder({page})
            .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
            .analyze();

        const critical = results.violations.filter(v => v.impact === 'critical');

        if (critical.length > 0) {
            console.log('\n=== Next Steps Drawer critical violations ===');
            for (const v of critical) {
                console.log(`  [CRITICAL] ${v.id}: ${v.description}`);
                console.log(`    Help: ${v.helpUrl}`);
                console.log(`    Nodes: ${v.nodes.length}`);
                for (const node of v.nodes.slice(0, 3)) {
                    console.log(`      - ${node.html}`);
                }
            }
        }

        expect(critical.length, 'Critical violations on Next Steps Drawer').toBe(0);
    });
});