import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property, Note} from '../fixtures/workspace';

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z').getTime();

// Job request note without budget - should trigger "add budget" suggestion
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

// Meetup request note without location - should trigger "add location" suggestion
const meetupRequestNote = (): Note => ({
    id: 'scene-meetup-request-note',
    title: 'Community garden meetup',
    content: '<p>Let\'s meet to plan the spring garden. Bring seeds and ideas!</p>',
    tags: ['request', 'social'],
    properties: [
        property('type', ['social/meetup-request']),
        property('frequency', ['monthly'])
    ],
    createdAt: new Date(FIXED_NOW - 3 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 3600_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.7,
});

// Note with high priority - should trigger "add deadline" suggestion
const urgentRequestNote = (): Note => ({
    id: 'scene-urgent-request-note',
    title: 'Urgent: Need plumber ASAP',
    content: '<p>Pipe burst in basement. Need someone today!</p>',
    tags: ['request', 'urgent'],
    properties: [
        property('type', ['request/need-request']),
        property('priority', ['urgent']),
        property('service', ['plumbing'])
    ],
    createdAt: new Date(FIXED_NOW - 1 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 300_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 1.0,
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

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('suggestions: job request missing budget', async ({page}) => {
    await seed(page, {
        notes: [jobRequestNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-job-request-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.getByText('Add budget', {exact: false}).first().waitFor({timeout: 10_000});
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'job-request-missing-budget',
        description: 'Job request note triggers "Add budget" suggestion via deterministic rules.',
    });
});

test('suggestions: meetup request missing location', async ({page}) => {
    await seed(page, {
        notes: [meetupRequestNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-meetup-request-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.getByText('Add location', {exact: false}).first().waitFor({timeout: 10_000});
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'meetup-request-missing-location',
        description: 'Meetup request note triggers "Add location" suggestion via deterministic rules.',
    });
});

test('suggestions: urgent request missing deadline', async ({page}) => {
    await seed(page, {
        notes: [urgentRequestNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-urgent-request-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.getByText('Add deadline', {exact: false}).first().waitFor({timeout: 10_000});
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'urgent-request-missing-deadline',
        description: 'Urgent request note triggers "Add deadline" suggestion via deterministic rules.',
    });
});

test('suggestions: skill-matched note shows fulfillment hint', async ({page}) => {
    await seed(page, {
        notes: [skillMatchedNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-skill-matched-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.getByText('Fulfillment available', {exact: false}).first().waitFor({timeout: 10_000});
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'skill-matched-fulfillment-hint',
        description: 'Note matching skill patterns shows fulfillment hint suggestion.',
    });
});

test('suggestions: multiple suggestions on one note', async ({page}) => {
    const multiTriggerNote = (): Note => ({
        ...jobRequestNote(),
        id: 'scene-multi-trigger-note',
        title: 'Urgent remote job - no budget or deadline',
        properties: [
            property('type', ['work/job-request', 'request/need-request']),
            property('role', ['developer']),
            property('priority', ['urgent']),
            property('remote', ['true']),
            property('task', ['web development'])
        ],
    });
    await seed(page, {
        notes: [multiTriggerNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-multi-trigger-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.getByText('Add budget', {exact: false}).first().waitFor({timeout: 10_000});
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'multiple-suggestions',
        description: 'Note with multiple triggers shows multiple suggestion cards (add budget, add deadline, fulfillment hint).',
    });
});

test('suggestions: empty state when no triggers', async ({page}) => {
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
    await seed(page, {
        notes: [simpleNote()],
        settings: defaultSettings(),
        hash: '#notes/scene-simple-note'
    });
    await page.getByTestId('toggle-inspector').click();
    await page.getByRole('tab', {name: /AI/}).click();
    await page.waitForSelector('text=Suggestions');
    await snap(page, {
        area: 'suggestions',
        state: 'empty-state',
        description: 'Simple note with no matching rules shows empty suggestions state with refresh button.',
    });
});

// test('suggestions: stale state after edit', async ({page}) => {
//     await seed(page, {
//         notes: [jobRequestNote()],
//         settings: defaultSettings(),
//         hash: '#notes/scene-job-request-note'
//     });
//     await page.getByTestId('toggle-inspector').click();
//     await page.getByRole('tab', {name: /AI/}).click();
//     await page.waitForSelector('text=Suggestions');
//     
//     // Wait for suggestions to load
//     await page.waitForSelector('text=Add budget', {timeout: 10_000});
//     
//     // Edit the note to trigger regeneration
//     await page.locator('[contenteditable="true"]').first().click();
//     await page.keyboard.press('ControlOrMeta+A');
//     await page.keyboard.type('Updated: ');
//     await page.keyboard.press('Enter');
//     
//     // Wait for debounced regeneration (2s)
//     await page.waitForTimeout(3000);
//     
//     await snap(page, {
//         area: 'suggestions',
//         state: 'stale-after-edit',
//         description: 'After editing a note, prior suggestions become stale and new generation starts.',
//     });
// });