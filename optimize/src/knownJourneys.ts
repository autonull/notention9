import type { JourneySpec } from './journey.js';

export const knownJourneys: Record<string, JourneySpec> = {
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