import type {AppSettings, Note, Property} from '../../../core/src/types/index';
import {DEFAULT_ONTOLOGY} from '../../../core/src/ontology/ontology.default';
import {buildDemoWorkspace} from '../../../core/src/fixtures/demoWorkspace';

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z').getTime();

export const demoNotes = (): Note[] => buildDemoWorkspace(FIXED_NOW);

export const defaultSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
    aiEnabled: false,
    developerMode: false,
    theme: 'dark',
    nostr: {privkey: null, relays: ['ws://localhost:7000']},
    ontology: DEFAULT_ONTOLOGY,
    customTemplates: [],
    ...overrides,
});

export const property = (key: string, values: string[], operator = 'is'): Property => ({key, operator, values});

export const noteWithDetails = (): Note => ({
    id: 'scene-editor-note',
    title: 'Winter repair day',
    content: [
        '<h2>Plan</h2>',
        '<p>Collect tools, list small repairs, and ask who can bring soup.</p>',
        '<p><span data-type="property" data-name="status" data-operator="is" data-value="open"></span></p>',
        '<p><span data-type="property" data-name="deadline" data-operator="is" data-value="2026-10-24"></span></p>',
        '<p>Keep it simple and local.</p>',
    ].join(''),
    tags: ['idea', 'community'],
    properties: [property('status', ['open']), property('deadline', ['2026-10-24'])],
    createdAt: new Date(FIXED_NOW - 3 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 3600_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 1,
});

export const deletedNote = (): Note => ({
    ...noteWithDetails(),
    id: 'scene-deleted-note',
    title: 'Old draft',
    deletedAt: new Date(FIXED_NOW - 600_000).toISOString(),
});

const taskNote = (id: string, title: string, status: string, tags: string[] = ['task']): Note => ({
    id,
    title,
    content: `<p>${title}</p>`,
    tags,
    properties: [property('type', ['task']), property('status', [status])],
    createdAt: new Date(FIXED_NOW - 7 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 3600_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.6,
});

export const taskNotes = (): Note[] => [
    taskNote('scene-task-running', 'Print flyers for the meetup', 'running'),
    taskNote('scene-task-queued', 'Collect tools for repair day', 'queued'),
    taskNote('scene-task-queued-2', 'Ask Maya about the shared garden', 'queued', ['task', 'community']),
    taskNote('scene-task-done', 'Book the community hall', 'completed'),
];

export const extractionNote = (): Note => ({
    id: 'scene-extraction-note',
    title: 'Frontend help wanted',
    content: '<p>Looking for a React developer for a two-week project. Budget between 800 and 1200 USD. Due tomorrow.</p>',
    tags: ['request'],
    properties: [],
    createdAt: new Date(FIXED_NOW - 2 * 3600_000).toISOString(),
    updatedAt: new Date(FIXED_NOW - 1800_000).toISOString(),
    source: {type: 'user', identifier: 'scene', timestamp: FIXED_NOW},
    privacy: 'private',
    priority: 0.7,
});
