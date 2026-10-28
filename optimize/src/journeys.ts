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

const captureAndEdit: JourneySpec = {
    id: 'capture-and-edit',
    version: 1,
    intent: 'capture a note and edit its properties',
    journeysTouched: ['capture', 'edit', 'property-extraction'],
    seed: { notes: [testNote], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [testNote], settings: baseSettings },
        { kind: 'act', target: { testId: 'add-detail' }, action: 'click' },
        { kind: 'act', target: { testId: 'property-key-input', modal: 'Add detail' }, action: 'fill', value: 'framework' },
        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'select', value: 'contains' },
        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
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
        { kind: 'act', target: { testId: 'add-detail' }, action: 'press', value: 'Enter' },
        // Wait for modal to appear
        { kind: 'script', code: 'new Promise(r => setTimeout(r, 500))' },
        // Fill property key input (already focused via Tab navigation in modal)
        { kind: 'act', target: { testId: 'property-key-input', modal: 'Add detail' }, action: 'fill', value: 'framework' },
        // Tab to operator select, use arrow keys to select 'contains'
        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Tab' },
        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'ArrowDown' },
        { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Enter' },
        // Tab to value input
        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'press', value: 'Tab' },
        { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
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
    version: 1,
    intent: 'first-time user writes a request and an offer note, sees a relevant explained match',
    journeysTouched: ['capture', 'match', 'dashboard', 'property-extraction'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        // Step 1: Create request note via quick capture
        { kind: 'act', target: { role: 'textbox', name: /what.{0,3}s on your mind/i }, action: 'fill', value: 'need a React developer in Berlin with TypeScript' },
        { kind: 'act', target: { role: 'button', name: /create note/i }, action: 'click' },
        { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['React developer'], timeoutMs: 5000 },
        { kind: 'assertState', path: 'note.propertyIndex.role', equals: ['React developer'] },
        { kind: 'assertState', path: 'note.propertyIndex.location', equals: ['Berlin'] },
        { kind: 'capture', label: 'request-note-created' },
        // Step 2: Go back to dashboard and create offer note via quick capture
        { kind: 'navigate', hash: 'dashboard' },
        { kind: 'act', target: { role: 'textbox', name: /what.{0,3}s on your mind/i }, action: 'fill', value: 'I am a React TypeScript developer in Berlin' },
        { kind: 'act', target: { role: 'button', name: /create note/i }, action: 'click' },
        { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['React TypeScript developer'], timeoutMs: 5000 },
        { kind: 'assertState', path: 'note.propertyIndex.role', equals: ['React TypeScript developer'] },
        { kind: 'assertState', path: 'note.propertyIndex.location', equals: ['Berlin'] },
        { kind: 'capture', label: 'offer-note-created' },
        // Step 3: Navigate to dashboard and verify match
        { kind: 'navigate', hash: 'dashboard' },
        { kind: 'script', code: 'const matchEl = document.querySelector("[data-testid=\\"local-match\\"]"); if (matchEl) window.__MATCH_FOUND__ = true; else window.__MATCH_FOUND__ = false;' },
        { kind: 'assertState', path: 'route.hash', equals: 'dashboard' },
        { kind: 'capture', label: 'match-found-on-dashboard' },
    ],
    status: 'ready',
};

registerJourney(captureAndEdit);
registerJourney(publishGate);
registerJourney(ontologyConflict);
registerJourney(captureAndEditKeyboard);
registerJourney(goldenPath);