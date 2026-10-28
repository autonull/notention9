import type { JourneySpec } from './journey.js';

export const knownJourneys: Record<string, JourneySpec> = {
    'golden-path': {
        id: 'golden-path',
        version: 1,
        intent: 'first-time user writes a request and an offer note, sees a relevant explained match',
        journeysTouched: ['capture', 'match', 'dashboard', 'property-extraction'],
        seed: {
            notes: [],
            settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } }
        },
        steps: [
            { kind: 'seed', notes: [], settings: {} },
            // Step 1: Create request note via quick capture
            { kind: 'act', target: { role: 'textbox', name: /what.{0,3}s on your mind/i }, action: 'fill', value: 'need a React developer in Berlin with TypeScript' },
            { kind: 'act', target: { role: 'button', name: /create note/i }, action: 'click' },
            { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['developer'], timeoutMs: 5000 },
            { kind: 'assertState', path: 'note.propertyIndex.role', equals: ['developer'] },
            { kind: 'assertState', path: 'note.propertyIndex.location', equals: ['Berlin'] },
            { kind: 'assertState', path: 'note.propertyIndex.skills', equals: ['React', 'TypeScript'] },
            { kind: 'capture', label: 'request-note-created' },
            // Step 2: Create offer note via quick capture
            { kind: 'act', target: { role: 'textbox', name: /what.{0,3}s on your mind/i }, action: 'fill', value: 'I am a React TypeScript developer in Berlin' },
            { kind: 'act', target: { role: 'button', name: /create note/i }, action: 'click' },
            { kind: 'waitForState', path: 'note.propertyIndex.role', equals: ['developer'], timeoutMs: 5000 },
            { kind: 'assertState', path: 'note.propertyIndex.role', equals: ['developer'] },
            { kind: 'assertState', path: 'note.propertyIndex.location', equals: ['Berlin'] },
            { kind: 'assertState', path: 'note.propertyIndex.skills', equals: ['React', 'TypeScript'] },
            { kind: 'capture', label: 'offer-note-created' },
            // Step 3: Navigate to dashboard and verify match
            { kind: 'navigate', hash: 'dashboard' },
            { kind: 'waitForState', path: 'note.propertyIndex.role', equals: null, timeoutMs: 3000 },
            { kind: 'script', code: 'const matchEl = document.querySelector("[data-testid=\\"local-match\\"]"); if (matchEl) window.__MATCH_FOUND__ = true; else window.__MATCH_FOUND__ = false;' },
            { kind: 'assertState', path: 'note.propertyIndex.role', equals: null },
            { kind: 'capture', label: 'match-found-on-dashboard' },
        ],
        status: 'ready',
    },
    'capture-and-edit': {
        id: 'capture-and-edit',
        version: 1,
        intent: 'capture a note and edit its properties',
        journeysTouched: ['capture', 'edit', 'property-extraction'],
        seed: {
            notes: [{
                id: 'scene-editor-note',
                title: 'Scene Editor Note',
                content: 'Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React, TypeScript"></span>',
                tags: ['development'],
                properties: [{ key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                privacy: 'private',
                priority: 1,
            }],
            settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } }
        },
        steps: [
            { kind: 'seed', notes: [], settings: {} },
            { kind: 'navigate', hash: 'notes/scene-editor-note' },
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
    },
    'capture-and-edit-keyboard': {
        id: 'capture-and-edit-keyboard',
        version: 1,
        intent: 'capture a note and edit its properties using keyboard only',
        journeysTouched: ['capture', 'edit', 'property-extraction', 'accessibility'],
        seed: {
            notes: [{
                id: 'scene-editor-note',
                title: 'Scene Editor Note',
                content: 'Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React, TypeScript"></span>',
                tags: ['development'],
                properties: [{ key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                privacy: 'private',
                priority: 1,
            }],
            settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } }
        },
        steps: [
            { kind: 'seed', notes: [], settings: {} },
            { kind: 'navigate', hash: 'notes/scene-editor-note' },
            { kind: 'act', target: { testId: 'add-detail' }, action: 'press', value: 'Enter' },
            { kind: 'script', code: 'new Promise(r => setTimeout(r, 500))' },
            { kind: 'act', target: { testId: 'property-key-input', modal: 'Add detail' }, action: 'fill', value: 'framework' },
            { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Tab' },
            { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'ArrowDown' },
            { kind: 'act', target: { testId: 'property-operator-select', modal: 'Add detail' }, action: 'press', value: 'Enter' },
            { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'press', value: 'Tab' },
            { kind: 'act', target: { testId: 'property-value-input', modal: 'Add detail' }, action: 'fill', value: 'Next.js' },
            { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Tab' },
            { kind: 'act', target: { role: 'button', name: /^add detail$/i, modal: 'Add detail' }, action: 'press', value: 'Enter' },
            { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
            { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
            { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
            { kind: 'assertState', path: 'note.propertyIndex.skill', equals: ['React', 'TypeScript'] },
            { kind: 'capture', label: 'after-edit-keyboard' },
        ],
        status: 'ready',
    },
    'publish-gate': {
        id: 'publish-gate',
        version: 1,
        intent: 'verify publish gate requires confirmation for private notes',
        journeysTouched: ['publish', 'privacy-gate'],
        seed: { notes: [], settings: { theme: 'dark', ontology: [], developerMode: false, aiEnabled: false, aiProvider: 'local', aiModel: '', googleGeminiApiKey: '', nostr: { privkey: null, relays: [] } } },
        steps: [
            { kind: 'seed', notes: [], settings: {} },
            { kind: 'navigate', hash: 'notes/private-note-for-publish' },
            { kind: 'act', target: { role: 'button', name: 'publish' }, action: 'click' },
            { kind: 'assertState', path: 'pendingConfirmations.0.action', equals: 'publish' },
            { kind: 'act', target: { role: 'button', name: 'cancel' }, action: 'click' },
            { kind: 'assertState', path: 'note.privacy', equals: 'private' },
            { kind: 'capture', label: 'after-cancel' },
            { kind: 'assertNoConsoleErrors' },
        ],
        status: 'ready',
    },
};

export function getKnownJourney(id: string): JourneySpec | undefined {
    return knownJourneys[id];
}

export function getKnownJourneyIds(): string[] {
    return Object.keys(knownJourneys);
}