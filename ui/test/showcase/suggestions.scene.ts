import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property, Note} from '../fixtures/workspace';

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z').getTime();

const baseNote = (overrides: Partial<Note> & Pick<Note, 'id' | 'title' | 'properties'>): Note => ({
    content: '<p>A short note.</p>',
    tags: ['request'],
    createdAt: new Date(FIXED_NOW - 2 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 1800_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.8,
    ...overrides,
});

const jobRequestNote = (): Note => baseNote({
    id: 'scene-job-request-note',
    title: 'Frontend developer needed',
    properties: [
        property('type', ['work/job-request']),
        property('role', ['frontend developer']),
        property('remote', ['true']),
    ],
});

const recurringRequestNote = (): Note => baseNote({
    id: 'scene-recurring-request-note',
    title: 'Garden help every Saturday',
    properties: [
        property('type', ['request/need-request']),
        property('frequency', ['weekly']),
    ],
});

const urgentRequestNote = (): Note => baseNote({
    id: 'scene-urgent-request-note',
    title: 'Urgent: Need plumber ASAP',
    properties: [
        property('type', ['request/need-request']),
        property('priority', ['urgent']),
        property('service', ['plumbing']),
    ],
});

const offerNote = (): Note => baseNote({
    id: 'scene-offer-note',
    title: 'Bike repair offer',
    tags: ['offer'],
    properties: [
        property('type', ['offer/skill-offer']),
        property('skill', ['bike repair']),
    ],
});

const multiTriggerNote = (): Note => baseNote({
    id: 'scene-multi-trigger-note',
    title: 'Urgent remote job - no budget or deadline',
    tags: ['request', 'work', 'urgent'],
    properties: [
        property('type', ['work/job-request', 'request/need-request']),
        property('role', ['developer']),
        property('priority', ['urgent']),
        property('remote', ['true']),
        property('task', ['web development']),
    ],
});

const simpleNote = (): Note => baseNote({
    id: 'scene-simple-note',
    title: 'Just a thought',
    content: '<p>Thinking about the weekend.</p>',
    tags: ['note'],
    properties: [],
    priority: 0,
});

async function showNextStep(page: any, note: Note) {
    await seed(page, {
        notes: [note],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: `#notes/${note.id}`,
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await page.locator('[data-testid^="next-step-card-"]').first().waitFor({timeout: 10_000});
}

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('suggestions: job request missing budget', async ({page}) => {
    await showNextStep(page, jobRequestNote());
    await snap(page, {
        area: 'suggestions',
        state: 'job-request-missing-budget',
        description: 'Job request note triggers "Add budget" next step via deterministic rules.',
    });
});

test('suggestions: recurring request missing schedule', async ({page}) => {
    await showNextStep(page, recurringRequestNote());
    await snap(page, {
        area: 'suggestions',
        state: 'recurring-request-missing-schedule',
        description: 'Recurring request note triggers "Add schedule" next step via deterministic rules.',
    });
});

test('suggestions: urgent request missing deadline', async ({page}) => {
    await showNextStep(page, urgentRequestNote());
    await snap(page, {
        area: 'suggestions',
        state: 'urgent-request-missing-deadline',
        description: 'Urgent request note triggers "Add deadline" next step via deterministic rules.',
    });
});

test('suggestions: offer missing contact', async ({page}) => {
    await showNextStep(page, offerNote());
    await snap(page, {
        area: 'suggestions',
        state: 'offer-missing-contact',
        description: 'Offer note triggers "Add contact" next step via deterministic rules.',
    });
});

test('suggestions: multiple suggestions on one note', async ({page}) => {
    await showNextStep(page, multiTriggerNote());
    await snap(page, {
        area: 'suggestions',
        state: 'multiple-suggestions',
        description: 'Note with multiple triggers shows multiple next step cards.',
    });
});

test('suggestions: empty state when no triggers', async ({page}) => {
    await seed(page, {
        notes: [simpleNote()],
        settings: defaultSettings({aiEnabled: false, developerMode: true}),
        hash: '#notes/scene-simple-note',
    });
    await page.waitForSelector('[data-testid="next-step-strip"]', {timeout: 15_000});
    await snap(page, {
        area: 'suggestions',
        state: 'empty-state',
        description: 'Simple note with no matching rules shows the empty next-steps state with refresh.',
    });
});
