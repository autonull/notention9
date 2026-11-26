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
    intent: 'verify ontology conflict detection',
    journeysTouched: ['ontology', 'conflict-detection'],
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

const captureAndEditPalette: JourneySpec = {
    id: 'capture-and-edit-palette',
    version: 1,
    intent: 'capture a note and edit its properties through command palettes',
    journeysTouched: ['capture', 'edit', 'property-extraction', 'palette'],
    seed: { notes: [testNote], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [testNote], settings: baseSettings },
        { kind: 'navigate', hash: 'notes' },
        { kind: 'act', target: { testId: 'app-shell' }, action: 'press', value: 'Control+k' },
        { kind: 'script', code: 'new Promise(r => setTimeout(r, 300))' },
        { kind: 'act', target: { testId: 'command-palette-input' }, action: 'fill', value: 'New Task' },
        { kind: 'script', code: 'new Promise(r => setTimeout(r, 250))' },
        { kind: 'act', target: { testId: 'command-palette-input' }, action: 'press', value: 'Enter' },
        { kind: 'waitForState', path: 'note.title', equals: 'New Task', timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.tags', equals: ['task'] },
        { kind: 'act', target: { testId: 'page-add-detail' }, action: 'press', value: 'Control+Shift+P' },
        { kind: 'script', code: 'new Promise(r => setTimeout(r, 300))' },
        { kind: 'act', target: { testId: 'property-palette-input' }, action: 'fill', value: 'framework' },
        { kind: 'act', target: { testId: 'property-palette-input' }, action: 'press', value: 'Enter' },
        { kind: 'capture', label: 'after-property-palette' },
        { kind: 'act', target: { testId: 'property-value-input', modal: 'Edit detail' }, action: 'fill', value: 'Next.js' },
        { kind: 'act', target: { role: 'button', name: /^save changes$/i, modal: 'Edit detail' }, action: 'click' },
        { kind: 'script', code: 'window.dispatchEvent(new CustomEvent("save-note"))' },
        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['Next.js'], timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['Next.js'] },
        { kind: 'capture', label: 'after-palette-edit' },
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
registerJourney(captureAndEditKeyboard);
registerJourney(captureAndEditPalette);
registerJourney(publishGate);
registerJourney(ontologyConflict);
registerJourney(goldenPath);

// Help System Journeys (from uisg.yaml)
const helpSystemCompletion: JourneySpec = {
    id: 'help-system-completion',
    version: 1,
    intent: 'User completes a help topic from start to finish',
    journeysTouched: ['help', 'onboarding'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/help' },
        { kind: 'act', target: { testId: 'help-sidebar' }, action: 'click' },
        { kind: 'act', target: { testId: 'help-topic-card' }, action: 'click' },
        { kind: 'waitForState', path: 'help.currentTopic', equals: 'create-first-note', timeoutMs: 5000 },
        { kind: 'assertState', path: 'help.currentTopic', equals: 'create-first-note' },
        { kind: 'capture', label: 'help-topic-completed' },
    ],
    status: 'ready',
};

const helpSearch: JourneySpec = {
    id: 'help-search',
    version: 1,
    intent: 'User searches for help topic',
    journeysTouched: ['help', 'search'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/help' },
        { kind: 'act', target: { testId: 'help-search-input' }, action: 'fill', value: 'create note' },
        { kind: 'act', target: { testId: 'help-search-result' }, action: 'click' },
        { kind: 'waitForState', path: 'help.currentTopic', equals: 'create-first-note', timeoutMs: 5000 },
        { kind: 'assertState', path: 'help.currentTopic', equals: 'create-first-note' },
        { kind: 'capture', label: 'help-search-completed' },
    ],
    status: 'ready',
};

const helpVideo: JourneySpec = {
    id: 'help-video',
    version: 1,
    intent: 'User watches help video',
    journeysTouched: ['help', 'video'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/help' },
        { kind: 'act', target: { testId: 'help-topic-card' }, action: 'click' },
        { kind: 'act', target: { testId: 'help-video-play' }, action: 'click' },
        { kind: 'waitForState', path: 'help.videoProgress', equals: 1, timeoutMs: 10000 },
        { kind: 'assertState', path: 'help.videoProgress', equals: 1 },
        { kind: 'capture', label: 'help-video-completed' },
    ],
    status: 'ready',
};

const helpInteractive: JourneySpec = {
    id: 'help-interactive',
    version: 1,
    intent: 'User completes interactive demo',
    journeysTouched: ['help', 'interactive'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/help' },
        { kind: 'act', target: { testId: 'help-topic-card' }, action: 'click' },
        { kind: 'act', target: { testId: 'help-interactive-start' }, action: 'click' },
        { kind: 'waitForState', path: 'help.demoCompleted', equals: true, timeoutMs: 10000 },
        { kind: 'assertState', path: 'help.demoCompleted', equals: true },
        { kind: 'capture', label: 'help-interactive-completed' },
    ],
    status: 'ready',
};

const helpProgress: JourneySpec = {
    id: 'help-progress',
    version: 1,
    intent: 'User tracks progress across topics',
    journeysTouched: ['help', 'progress'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/help' },
        { kind: 'act', target: { testId: 'help-progress-bar' }, action: 'click' },
        { kind: 'waitForState', path: 'help.progressVisible', equals: true, timeoutMs: 3000 },
        { kind: 'assertState', path: 'help.progressVisible', equals: true },
        { kind: 'capture', label: 'help-progress-viewed' },
    ],
    status: 'ready',
};

const helpContextual: JourneySpec = {
    id: 'help-contextual',
    version: 1,
    intent: 'Help appears contextually (idle, error, feature gate)',
    journeysTouched: ['help', 'contextual'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/notes' },
        { kind: 'waitForState', path: 'help.contextualPromptVisible', equals: true, timeoutMs: 15000 },
        { kind: 'act', target: { testId: 'help-contextual-accept' }, action: 'click' },
        { kind: 'waitForState', path: 'help.currentTopic', equals: 'create-first-note', timeoutMs: 5000 },
        { kind: 'assertState', path: 'help.currentTopic', equals: 'create-first-note' },
        { kind: 'capture', label: 'help-contextual-accepted' },
    ],
    status: 'ready',
};

// Mobile Journeys (from uisg.yaml)
const mobilePropertyEditor: JourneySpec = {
    id: 'mobile-property-editor',
    version: 1,
    intent: 'User edits property on mobile',
    journeysTouched: ['mobile', 'properties'],
    seed: { notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
    steps: [
        { kind: 'seed', notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
        { kind: 'act', target: { testId: 'note-property-framework' }, action: 'click' },
        { kind: 'act', target: { testId: 'mobile-property-editor-input' }, action: 'fill', value: 'React Native' },
        { kind: 'act', target: { testId: 'mobile-property-editor-save' }, action: 'click' },
        { kind: 'waitForState', path: 'note.propertyIndex.framework', equals: ['React Native'], timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.propertyIndex.framework', equals: ['React Native'] },
        { kind: 'capture', label: 'mobile-property-edited' },
    ],
    status: 'ready',
};

const mobileArrangeMenu: JourneySpec = {
    id: 'mobile-arrange-menu',
    version: 1,
    intent: 'User arranges items via bottom sheet',
    journeysTouched: ['mobile', 'arrange'],
    seed: { notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
    steps: [
        { kind: 'seed', notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
        { kind: 'act', target: { testId: 'mobile-arrange-trigger' }, action: 'click' },
        { kind: 'act', target: { testId: 'mobile-arrange-sheet' }, action: 'press', value: 'ArrowDown' },
        { kind: 'act', target: { testId: 'mobile-arrange-confirm' }, action: 'click' },
        { kind: 'waitForState', path: 'note.order', equals: 1, timeoutMs: 3000 },
        { kind: 'assertState', path: 'note.order', equals: 1 },
        { kind: 'capture', label: 'mobile-arrange-completed' },
    ],
    status: 'ready',
};

const mobileContextRail: JourneySpec = {
    id: 'mobile-context-rail',
    version: 1,
    intent: 'User navigates context rail',
    journeysTouched: ['mobile', 'context'],
    seed: { notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
    steps: [
        { kind: 'seed', notes: [testNote], settings: { ...baseSettings, density: 'compact' } },
        { kind: 'act', target: { testId: 'mobile-context-rail-tab-1' }, action: 'click' },
        { kind: 'act', target: { testId: 'mobile-context-rail-tab-2' }, action: 'click' },
        { kind: 'waitForState', path: 'context.activeTab', equals: 'tab-2', timeoutMs: 3000 },
        { kind: 'assertState', path: 'context.activeTab', equals: 'tab-2' },
        { kind: 'capture', label: 'mobile-context-rail-navigated' },
    ],
    status: 'ready',
};

const mobileMap: JourneySpec = {
    id: 'mobile-map',
    version: 1,
    intent: 'User interacts with map on mobile',
    journeysTouched: ['mobile', 'map'],
    seed: { notes: [], settings: { ...baseSettings, density: 'compact' } },
    steps: [
        { kind: 'seed', notes: [], settings: { ...baseSettings, density: 'compact' } },
        { kind: 'navigate', hash: '#/map' },
        { kind: 'act', target: { testId: 'mobile-map-fab' }, action: 'click' },
        { kind: 'act', target: { testId: 'mobile-map-geolocation' }, action: 'click' },
        { kind: 'waitForState', path: 'map.userLocation', equals: true, timeoutMs: 10000 },
        { kind: 'assertState', path: 'map.userLocation', equals: true },
        { kind: 'capture', label: 'mobile-map-interacted' },
    ],
    status: 'ready',
};

const mobileHeader: JourneySpec = {
    id: 'mobile-header',
    version: 1,
    intent: 'User opens sidebar via hamburger',
    journeysTouched: ['mobile', 'navigation'],
    seed: { notes: [], settings: { ...baseSettings, density: 'compact' } },
    steps: [
        { kind: 'seed', notes: [], settings: { ...baseSettings, density: 'compact' } },
        { kind: 'act', target: { testId: 'mobile-hamburger' }, action: 'click' },
        { kind: 'waitForState', path: 'sidebar.isOpen', equals: true, timeoutMs: 3000 },
        { kind: 'act', target: { testId: 'sidebar-nav-notes' }, action: 'click' },
        { kind: 'waitForState', path: 'view.active', equals: 'notes', timeoutMs: 3000 },
        { kind: 'assertState', path: 'view.active', equals: 'notes' },
        { kind: 'capture', label: 'mobile-header-navigated' },
    ],
    status: 'ready',
};

// Empty State Journeys
const emptyStateNotesAll: JourneySpec = {
    id: 'empty-state-notes-all',
    version: 1,
    intent: 'New user sees empty notes view',
    journeysTouched: ['empty-state', 'onboarding'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/notes' },
        { kind: 'act', target: { testId: 'empty-state-primary-cta' }, action: 'click' },
        { kind: 'waitForState', path: 'note.title', equals: 'New Note', timeoutMs: 5000 },
        { kind: 'assertState', path: 'note.title', equals: 'New Note' },
        { kind: 'capture', label: 'empty-state-notes-cta-clicked' },
    ],
    status: 'ready',
};

const emptyStateNetwork: JourneySpec = {
    id: 'empty-state-network',
    version: 1,
    intent: 'User has no network connections',
    journeysTouched: ['empty-state', 'network'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/network' },
        { kind: 'act', target: { testId: 'empty-state-primary-cta' }, action: 'click' },
        { kind: 'waitForState', path: 'network.connecting', equals: true, timeoutMs: 5000 },
        { kind: 'assertState', path: 'network.connecting', equals: true },
        { kind: 'capture', label: 'empty-state-network-cta-clicked' },
    ],
    status: 'ready',
};

const emptyStateMatches: JourneySpec = {
    id: 'empty-state-matches',
    version: 1,
    intent: 'User has no matches',
    journeysTouched: ['empty-state', 'matching'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/matches' },
        { kind: 'act', target: { testId: 'empty-state-primary-cta' }, action: 'click' },
        { kind: 'waitForState', path: 'describeIt.open', equals: true, timeoutMs: 5000 },
        { kind: 'assertState', path: 'describeIt.open', equals: true },
        { kind: 'capture', label: 'empty-state-matches-cta-clicked' },
    ],
    status: 'ready',
};

// Settings Journeys
const settingsTask: JourneySpec = {
    id: 'settings-task',
    version: 1,
    intent: 'User completes a settings task',
    journeysTouched: ['settings'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/settings' },
        { kind: 'act', target: { testId: 'settings-search' }, action: 'fill', value: 'theme' },
        { kind: 'act', target: { testId: 'setting-theme' }, action: 'click' },
        { kind: 'act', target: { testId: 'theme-option-dark' }, action: 'click' },
        { kind: 'waitForState', path: 'settings.theme', equals: 'dark', timeoutMs: 3000 },
        { kind: 'assertState', path: 'settings.theme', equals: 'dark' },
        { kind: 'capture', label: 'settings-task-completed' },
    ],
    status: 'ready',
};

const settingsWizard: JourneySpec = {
    id: 'settings-wizard',
    version: 1,
    intent: 'First-run user completes settings wizard',
    journeysTouched: ['settings', 'onboarding'],
    seed: { notes: [], settings: baseSettings },
    steps: [
        { kind: 'seed', notes: [], settings: baseSettings },
        { kind: 'navigate', hash: '#/settings' },
        { kind: 'act', target: { testId: 'settings-wizard-next' }, action: 'click' },
        { kind: 'act', target: { testId: 'settings-wizard-next' }, action: 'click' },
        { kind: 'act', target: { testId: 'settings-wizard-complete' }, action: 'click' },
        { kind: 'waitForState', path: 'settings.wizardCompleted', equals: true, timeoutMs: 5000 },
        { kind: 'assertState', path: 'settings.wizardCompleted', equals: true },
        { kind: 'capture', label: 'settings-wizard-completed' },
    ],
    status: 'ready',
};

registerJourney(helpSystemCompletion);
registerJourney(helpSearch);
registerJourney(helpVideo);
registerJourney(helpInteractive);
registerJourney(helpProgress);
registerJourney(helpContextual);
registerJourney(mobilePropertyEditor);
registerJourney(mobileArrangeMenu);
registerJourney(mobileContextRail);
registerJourney(mobileMap);
registerJourney(mobileHeader);
registerJourney(emptyStateNotesAll);
registerJourney(emptyStateNetwork);
registerJourney(emptyStateMatches);
registerJourney(settingsTask);
registerJourney(settingsWizard);