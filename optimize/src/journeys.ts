import { registerJourney } from './registry.js';
import type { JourneySpec } from './journey.js';
import type { Note, AppSettings } from '@notention/core';

const baseSettings: AppSettings = {
    theme: 'dark',
    developerMode: false,
    aiEnabled: false,
    aiProvider: 'local',
    aiModel: '',
    googleGeminiApiKey: '',
    nostr: { privkey: null, relays: [] },
    ontology: [],
};

const captureAndEdit: JourneySpec = {
    id: 'capture-and-edit',
    version: 1,
    intent: 'capture a note and edit its properties',
    journeysTouched: ['capture', 'edit', 'property-extraction'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: 'notes/scene-editor-note' },
        { kind: 'act', target: { testId: 'add-property' }, action: 'click' },
        { kind: 'act', target: { role: 'textbox', name: 'property key' }, action: 'fill', value: 'framework' },
        { kind: 'act', target: { role: 'textbox', name: 'property value' }, action: 'fill', value: 'Next.js' },
        { kind: 'act', target: { role: 'button', name: 'add' }, action: 'click' },
        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
        { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
        { kind: 'capture', label: 'after-edit' },
        { kind: 'assertNoConsoleErrors' },
    ],
    status: 'ready',
};

const publishGate: JourneySpec = {
    id: 'publish-gate',
    version: 1,
    intent: 'verify publish gate requires confirmation for private notes',
    journeysTouched: ['publish', 'privacy-gate'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: 'notes/private-note-for-publish' },
        { kind: 'act', target: { role: 'button', name: 'publish' }, action: 'click' },
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
    version: 1,
    intent: 'verify ontology conflict detection and resolution',
    journeysTouched: ['ontology', 'conflict-resolution'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: 'notes/ontology-conflict-note' },
        { kind: 'assertState', path: 'note.propertyIndex.status', equals: ['pending'] },
    ],
    status: 'draft',
};

registerJourney(captureAndEdit);
registerJourney(publishGate);
registerJourney(ontologyConflict);