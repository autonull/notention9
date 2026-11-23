import { registerJourney } from './registry.js';
import type { JourneySpec } from './journey.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { Note, AppSettings } from '@notention/core';

const baseSettings: AppSettings = {
    theme: 'dark',
    density: 'comfortable',
    accentColor: '#2563eb',
    developerMode: false,
    aiEnabled: false,
    aiProvider: 'local',
    aiModel: '',
    googleGeminiApiKey: '',
    nostr: { privkey: null, relays: [] },
    ontology: [],
};

const testNote: Note = {
    id: 'scene-editor-note',
    title: 'Scene Editor Note',
    content: 'Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React, TypeScript"></span>',
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

const conflictNote: Note = {
    ...testNote,
    id: 'conflict-note',
    title: 'Meetup with too many seats',
    properties: [{ key: 'capacity', operator: 'is', values: ['many'] }],
};
const privatePublishNote: Note = {
    ...testNote,
    id: 'private-note-for-publish',
    title: 'Private note for publish',
    privacy: 'private',
};
const captureAndEdit: JourneySpec = {
    id: 'capture-and-edit',
    version: 1,
    intent: 'capture a note and edit its properties',
    journeysTouched: ['capture', 'edit', 'property-extraction'],
    seed: { notes: [testNote], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [testNote], settings: baseSettings },
        { kind: 'act', target: { testId: 'page-add-detail' }, action: 'click' },
        { kind: 'act', target: { label: 'Key', modal: 'Add detail' }, action: 'fill', value: 'framework' },
        { kind: 'act', target: { label: 'Comparison', modal: 'Add detail' }, action: 'select', value: 'contains' },
        { kind: 'act', target: { label: 'Value', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'click' },
        { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
        { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
        { kind: 'capture', label: 'after-edit' },
    ],
    status: 'ready',
};

const publishGate: JourneySpec = {
    id: 'publish-gate',
    version: 1,
    intent: 'verify publish gate requires confirmation for private notes',
    journeysTouched: ['publish', 'privacy-gate'],
    seed: { notes: [privatePublishNote], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [privatePublishNote], settings: baseSettings },
        { kind: 'navigate', hash: 'notes/private-note-for-publish' },
        { kind: 'act', target: { role: 'button', name: 'Publish', exact: true }, action: 'click' },
        { kind: 'assertState', path: 'pendingConfirmations.0.action', equals: 'publish' },
        { kind: 'act', target: { role: 'button', name: 'cancel' }, action: 'click' },
        { kind: 'assertState', path: 'note.privacy', equals: 'private' },
        { kind: 'capture', label: 'after-cancel' },
        { kind: 'assertNoConsoleErrors' },
    ],
    status: 'ready',
};

const ontologyConflict: JourneySpec = {
    id: 'ontology-conflict',
    version: 2,
    intent: 'verify ontology conflict detection and resolution',
    journeysTouched: ['ontology', 'conflict-resolution'],
    seed: { notes: [conflictNote], settings: { ...baseSettings, ontology: DEFAULT_ONTOLOGY } },
    steps: [
        { kind: 'seed', notes: [conflictNote], settings: { ...baseSettings, ontology: DEFAULT_ONTOLOGY } },
        { kind: 'navigate', hash: 'settings/ontology' },
        { kind: 'act', target: { role: 'tab', name: 'Conflicts' }, action: 'click' },
        { kind: 'waitForState', path: 'conflicts.0.propertyKey', equals: 'capacity', timeoutMs: 5000 },
        { kind: 'assertState', path: 'conflicts.length', equals: 1 },
        { kind: 'capture', label: 'conflict-visible' },
    ],
    status: 'ready',
};

// Keyboard-only variant of capture-and-edit
const captureAndEditKeyboard: JourneySpec = {
    id: 'capture-and-edit-keyboard',
    version: 1,
    intent: 'capture a note and edit its properties using keyboard only',
    journeysTouched: ['capture', 'edit', 'property-extraction', 'accessibility'],
    seed: { notes: [testNote], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [testNote], settings: baseSettings },
        // Focus the add-detail button and press Enter
        { kind: 'act', target: { testId: 'page-add-detail' }, action: 'press', value: 'Enter' },
        // Wait for modal to appear
        { kind: 'script', code: 'new Promise(r => setTimeout(r, 500))' },
        // Fill property key input (already focused via Tab navigation in modal)
        { kind: 'act', target: { label: 'Key', modal: 'Add detail' }, action: 'fill', value: 'framework' },
        // Tab to operator select, use arrow keys to select 'contains'
        { kind: 'act', target: { label: 'Comparison', modal: 'Add detail' }, action: 'press', value: 'Tab' },
        { kind: 'act', target: { label: 'Comparison', modal: 'Add detail' }, action: 'press', value: 'ArrowDown' },
        { kind: 'act', target: { label: 'Comparison', modal: 'Add detail' }, action: 'press', value: 'Enter' },
        // Tab to value input
        { kind: 'act', target: { label: 'Value', modal: 'Add detail' }, action: 'press', value: 'Tab' },
        { kind: 'act', target: { label: 'Value', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
        // Tab to Add Detail button and press Enter
        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Tab' },
        { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Enter' },
        { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
        { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
        { kind: 'capture', label: 'after-edit-keyboard' },
    ],
    status: 'ready',
};

const goldenPath: JourneySpec = {
    id: 'golden-path',
    version: 2,
    intent: 'first-time user writes a request and an offer note, sees a relevant explained match',
    journeysTouched: ['capture', 'match', 'property-extraction'],
    seed: { notes: [], settings: { ...baseSettings, ontology: DEFAULT_ONTOLOGY } },
    steps: [
        { kind: 'seed', notes: [], settings: { ...baseSettings, ontology: DEFAULT_ONTOLOGY } },
        { kind: 'act', target: { role: 'button', name: 'New note' }, action: 'click' },
        { kind: 'act', target: { role: 'textbox', name: 'Note title' }, action: 'fill', value: 'Looking for a React developer in Berlin' },
        { kind: 'act', target: { role: 'textbox', name: 'Note body' }, action: 'fill', value: 'need a React developer in Berlin with TypeScript #request' },
        { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['React developer'], timeoutMs: 5000 },
        { kind: 'assertState', path: 'note.propertyIndex.location', equals: ['Berlin'] },
        { kind: 'capture', label: 'request-note-created' },
        { kind: 'navigate', hash: 'notes' },
        { kind: 'act', target: { role: 'button', name: 'New note' }, action: 'click' },
        { kind: 'act', target: { role: 'textbox', name: 'Note title' }, action: 'fill', value: 'I am a React developer in Berlin' },
        { kind: 'act', target: { role: 'textbox', name: 'Note body' }, action: 'fill', value: 'I am a React developer in Berlin with TypeScript #offer' },
        { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['React developer'], timeoutMs: 5000 },
        { kind: 'capture', label: 'offer-note-created' },
        { kind: 'act', target: { role: 'tab', name: 'Matches' }, action: 'click' },
        { kind: 'waitForState', path: 'matches.length', equals: 1, timeoutMs: 5000 },
        { kind: 'waitForState', path: 'matches.0.matched', equals: ['role', 'careRequirements'], timeoutMs: 5000 },
        { kind: 'capture', label: 'match-explained-on-rail' },
    ],
    status: 'ready',
};

registerJourney(captureAndEdit);
registerJourney(publishGate);
registerJourney(ontologyConflict);
registerJourney(captureAndEditKeyboard);
registerJourney(goldenPath);