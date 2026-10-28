import { DiscoveryEngine } from './index.js';
import { GoalParser, ParsedGoal, InferredAction } from './goalParser.js';
import { SelectorInference } from './selectorInference.js';
import type { JourneySpec, Step, Target } from '../journey.js';
import type { Note, AppSettings } from '@notention/core';
import type { Finding } from '../finding.js';
import { loadBundle } from '../replay.js';

export interface SynthesisOptions {
    projectRoot?: string;
    includeTraceAssertions?: boolean;
    includeAriaAssertions?: boolean;
    maxSteps?: number;
    seedNotes?: Note[];
    seedSettings?: Partial<AppSettings>;
}

export class JourneySynthesizer {
    private discoveryEngine: DiscoveryEngine;
    private goalParser: GoalParser;
    private selectorInference: SelectorInference;

    constructor(discoveryEngine?: DiscoveryEngine) {
        this.discoveryEngine = discoveryEngine || new DiscoveryEngine();
        this.goalParser = new GoalParser(this.discoveryEngine);
        this.selectorInference = new SelectorInference();
    }

    static fromGoal(goal: string, options: SynthesisOptions = {}): JourneySpec {
        const synthesizer = new JourneySynthesizer();
        return synthesizer.synthesize(goal, options);
    }

    synthesize(goal: string, options: SynthesisOptions = {}): JourneySpec {
        const projectRoot = options.projectRoot || '/home/me/notention9';

        // Discover components, selectors, and state paths
        const discovery = this.discoveryEngine.discoverWithTypes(projectRoot);
        const selectors = this.selectorInference.infer(discovery.discovery);

        // Parse the goal
        const parsedGoal = this.goalParser.parse(goal, projectRoot);

        // Generate journey ID from goal
        const journeyId = this.generateJourneyId(goal);

        // Build steps
        const steps = this.buildSteps(parsedGoal, selectors, discovery.statePathRegistry, options);

        // Build seed
        const seed = this.buildSeed(parsedGoal, options);

        // Determine status
        const status = steps.length > 0 && parsedGoal.targetState.path ? 'ready' : 'draft';

        // Generate intent description
        const intent = this.generateIntent(goal, parsedGoal);

        return {
            id: journeyId,
            version: 1,
            intent,
            journeysTouched: this.inferJourneysTouched(parsedGoal),
            seed,
            steps,
            status,
        };
    }

    private generateJourneyId(goal: string): string {
        // Create a slug from the goal
        return goal
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    private generateIntent(goal: string, parsedGoal: ParsedGoal): string {
        // Use the original goal as intent, or generate a descriptive one
        if (goal.length > 10 && goal.length < 100) {
            return goal;
        }

        const action = parsedGoal.actions[0]?.intent || 'perform action';
        const target = parsedGoal.targetState.path;
        return `${action.replace('note.', '')} ${target}`;
    }

    private inferJourneysTouched(parsedGoal: ParsedGoal): string[] {
        const journeys: string[] = [];

        for (const action of parsedGoal.actions) {
            if (action.intent.includes('capture') || action.intent.includes('create')) {
                journeys.push('note-capture');
            }
            if (action.intent.includes('property') || action.intent.includes('edit')) {
                journeys.push('property-editing');
            }
            if (action.intent.includes('publish')) {
                journeys.push('publishing');
            }
            if (action.intent.includes('persistence') || action.intent.includes('reload')) {
                journeys.push('persistence');
            }
            if (action.intent.includes('select')) {
                journeys.push('note-navigation');
            }
        }

        return [...new Set(journeys)];
    }

    private buildSeed(parsedGoal: ParsedGoal, options: SynthesisOptions): { notes: Note[]; settings: Partial<AppSettings> } {
        const notes = options.seedNotes || this.generateDefaultNotes(parsedGoal);
        const settings = options.seedSettings || {
            ontology: [],
            aiEnabled: false,
            aiProvider: 'local',
            aiModel: '',
            googleGeminiApiKey: '',
            theme: 'dark',
        };

        // Adjust privacy based on constraints
        if (parsedGoal.constraints.privacy === 'public') {
            for (const note of notes) {
                note.privacy = 'public';
            }
        } else if (parsedGoal.constraints.privacy === 'private') {
            for (const note of notes) {
                note.privacy = 'private';
            }
        }

        return { notes, settings };
    }

    private generateDefaultNotes(parsedGoal: ParsedGoal): Note[] {
        const now = new Date().toISOString();
        const noteId = `synthesized-${Date.now()}`;

        return [{
            id: noteId,
            title: parsedGoal.targetState.path.includes('property')
                ? 'Note for property test'
                : 'Synthesized Note',
            content: 'Test content for synthesized journey',
            tags: ['test', 'synthesized'],
            properties: parsedGoal.targetState.type === 'property'
                ? [{ key: parsedGoal.targetState.path.split('.').pop() || 'test', operator: 'is', values: ['test-value'] }]
                : [],
            createdAt: now,
            updatedAt: now,
            source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
            privacy: 'private',
            priority: 1,
        }];
    }

    private buildSteps(
        parsedGoal: ParsedGoal,
        selectors: Map<string, import('./selectorInference').InferredSelector>,
        statePathRegistry: import('./statePathRegistry').StatePathRegistry,
        options: SynthesisOptions
    ): Step[] {
        const steps: Step[] = [];
        let stepIndex = 0;

        // 1. Navigation step (if needed)
        if (parsedGoal.targetState.type === 'note' || parsedGoal.targetState.type === 'property') {
            const navAction = parsedGoal.actions.find(a => a.intent === 'note.select');
            if (navAction) {
                steps.push(this.createNavigateStep(navAction, parsedGoal));
                stepIndex++;
            }
        }

        // 2. Initial state assertion
        steps.push(this.createInitialAssertion(parsedGoal, statePathRegistry));
        stepIndex++;

        // 3. Action steps
        for (const action of parsedGoal.actions) {
            if (action.intent === 'note.select') continue; // Already handled

            const actionSteps = this.createActionSteps(action, selectors, parsedGoal, stepIndex);
            steps.push(...actionSteps);
            stepIndex += actionSteps.length;
        }

        // 4. Final state assertion
        steps.push(this.createFinalAssertion(parsedGoal, statePathRegistry));
        stepIndex++;

        // 5. Optional: reload and persistence check
        if (parsedGoal.targetState.type === 'property' || parsedGoal.targetState.type === 'note') {
            steps.push(this.createReloadStep(parsedGoal));
            stepIndex++;
            steps.push(this.createPersistenceAssertion(parsedGoal, statePathRegistry));
            stepIndex++;
        }

        // 6. Console errors check
        steps.push({ kind: 'assertNoConsoleErrors' });

        return steps;
    }

    private createNavigateStep(action: InferredAction, parsedGoal: ParsedGoal): Step {
        // Determine hash from note ID in seed
        const noteId = parsedGoal.constraints.privacy === 'public' ? 'public-note' : 'synthesized-note';
        return {
            kind: 'navigate',
            hash: `notes/${noteId}`,
        };
    }

    private createInitialAssertion(parsedGoal: ParsedGoal, statePathRegistry: import('./statePathRegistry').StatePathRegistry): Step {
        // Assert initial state exists
        if (parsedGoal.targetState.type === 'property') {
            const propKey = parsedGoal.targetState.path.split('.').pop();
            return {
                kind: 'assertState',
                path: `note.propertyIndex.${propKey}`,
                equals: [], // Should be empty initially
            };
        }

        return {
            kind: 'assertState',
            path: 'note.id',
            equals: expect.any(String), // Note exists
        };
    }

    private createActionSteps(
        action: InferredAction,
        selectors: Map<string, import('./selectorInference').InferredSelector>,
        parsedGoal: ParsedGoal,
        stepIndex: number
    ): Step[] {
        const steps: Step[] = [];

        switch (action.intent) {
            case 'note.addProperty':
            case 'note.insertProperty':
                // Open property modal
                steps.push({
                    kind: 'act',
                    target: this.resolveSelector(action.selector, selectors) || { role: 'button', name: 'Add detail' },
                    action: 'click',
                });

                // Fill property form
                const propKey = parsedGoal.targetState.path.split('.').pop() || 'property';
                steps.push({
                    kind: 'act',
                    target: { label: 'Detail' },
                    action: 'fill',
                    value: propKey,
                });

                steps.push({
                    kind: 'act',
                    target: { label: 'Comparison' },
                    action: 'fill',
                    value: 'contains',
                });

                steps.push({
                    kind: 'act',
                    target: { label: 'Value' },
                    action: 'fill',
                    value: 'test-value',
                });

                // Submit
                steps.push({
                    kind: 'act',
                    target: { role: 'button', name: 'Add detail' },
                    action: 'click',
                });
                break;

            case 'note.publish':
                steps.push({
                    kind: 'act',
                    target: this.resolveSelector(action.selector, selectors) || { role: 'button', name: 'Publish' },
                    action: 'click',
                });
                break;

            case 'note.acceptExtraction':
                steps.push({
                    kind: 'act',
                    target: this.resolveSelector(action.selector, selectors) || { role: 'button', name: 'Accept' },
                    action: 'click',
                });
                break;

            case 'note.rejectExtraction':
                steps.push({
                    kind: 'act',
                    target: this.resolveSelector(action.selector, selectors) || { role: 'button', name: 'Reject' },
                    action: 'click',
                });
                break;
        }

        return steps;
    }

    private createFinalAssertion(parsedGoal: ParsedGoal, statePathRegistry: import('./statePathRegistry').StatePathRegistry): Step {
        if (parsedGoal.targetState.type === 'property') {
            const propKey = parsedGoal.targetState.path.split('.').pop();
            return {
                kind: 'assertState',
                path: `note.propertyIndex.${propKey}`,
                equals: ['test-value'],
            };
        }

        if (parsedGoal.targetState.type === 'confirmation') {
            return {
                kind: 'assertState',
                path: 'pendingConfirmations',
                equals: expect.arrayContaining([expect.objectContaining({ action: 'publish' })]),
            };
        }

        if (parsedGoal.targetState.type === 'review') {
            return {
                kind: 'assertState',
                path: 'review',
                equals: expect.arrayContaining([expect.any(Object)]),
            };
        }

        return {
            kind: 'assertState',
            path: 'note.id',
            equals: expect.any(String),
        };
    }

    private createReloadStep(parsedGoal: ParsedGoal): Step {
        return {
            kind: 'navigate',
            hash: 'notes/synthesized-note',
        };
    }

    private createPersistenceAssertion(parsedGoal: ParsedGoal, statePathRegistry: import('./statePathRegistry').StatePathRegistry): Step {
        if (parsedGoal.targetState.type === 'property') {
            const propKey = parsedGoal.targetState.path.split('.').pop();
            return {
                kind: 'assertState',
                path: `note.propertyIndex.${propKey}`,
                equals: ['test-value'],
            };
        }

        return {
            kind: 'assertState',
            path: 'note.id',
            equals: expect.any(String),
        };
    }

    private resolveSelector(
        selector: { role?: string; name?: string; testId?: string; label?: string },
        selectors: Map<string, import('./selectorInference').InferredSelector>
    ): Target | null {
        // Try exact match on testId
        if (selector.testId) {
            const found = Array.from(selectors.values()).find(s => s.target.testId === selector.testId);
            if (found) return found.target as Target;
        }

        // Match on role + name
        if (selector.role && selector.name) {
            const found = Array.from(selectors.values()).find(s =>
                s.target.role === selector.role && s.target.name === selector.name
            );
            if (found) return found.target as Target;
        }

        // Match on label
        if (selector.label) {
            const found = Array.from(selectors.values()).find(s => s.target.label === selector.label);
            if (found) return found.target as Target;
        }

        return null;
    }

    /**
     * Generate a regression test journey from a finding.
     * The journey will target the exact state path that failed and assert the expected value.
     */
    async generateRegressionTest(finding: Finding): Promise<JourneySpec> {
        // Extract bundle runId from reproduction (handle both old string format and new object format)
        const reproductionBundle = typeof finding.reproduction === 'object' 
            ? finding.reproduction.bundle 
            : '';
        const reproductionJourneyId = typeof finding.reproduction === 'object'
            ? finding.reproduction.journeyId
            : 'unknown';

        if (!reproductionBundle) {
            throw new Error(`Finding has no reproduction bundle`);
        }

        // Load the original bundle to get the expected state
        const bundle = await loadBundle(reproductionBundle);
        if (!bundle) {
            throw new Error(`Bundle not found for run: ${reproductionBundle}`);
        }

        // Extract the state path from the finding location
        const statePath = finding.location; // e.g., "note.propertyIndex.framework"
        
        // Find the expected value from the original bundle's snapshots
        let expectedValue: unknown = null;
        for (const snapshot of bundle.snapshots) {
            const value = this.resolvePath(snapshot.state, statePath);
            if (value !== undefined) {
                expectedValue = value;
                break;
            }
        }

        // Generate journey ID
        const journeyId = `regression-${finding.id}`;

        // Build steps for the regression test
        const steps: Step[] = [];

        // 1. Seed from the original journey's seed
        const journey = this.getJourneySync(reproductionJourneyId);
        if (journey) {
            steps.push({ kind: 'seed', notes: journey.seed.notes, settings: journey.seed.settings as any });
        } else {
            // Fallback to minimal seed
            steps.push({ 
                kind: 'seed', 
                notes: [], 
                settings: { theme: 'dark', ontology: [] } 
            });
        }

        // 2. Navigate to the note (use the original journey's navigation if available)
        if (journey) {
            for (const step of journey.steps) {
                if (step.kind === 'navigate') {
                    steps.push(step);
                    break;
                }
            }
        } else {
            steps.push({ kind: 'navigate', hash: 'notes/scene-editor-note' });
        }

        // 3. Add initial assertion - state should exist
        steps.push({ kind: 'assertState', path: 'note.id', equals: expect.any(String) });

        // 4. Add the specific regression assertion - this is the key part
        // The finding's location tells us what state path to check
        steps.push({ 
            kind: 'assertState', 
            path: statePath, 
            equals: expectedValue ?? [] // Expected value from bundle
        });

        // 5. Console errors check
        steps.push({ kind: 'assertNoConsoleErrors' });

        return {
            id: journeyId,
            version: 1,
            intent: `Regression test for finding: ${finding.title}`,
            journeysTouched: ['regression', finding.journey],
            seed: journey?.seed ?? { notes: [], settings: { theme: 'dark', ontology: [] } },
            steps,
            status: 'ready',
        };
    }

    private getJourneySync(journeyId: string): JourneySpec | undefined {
        // Known journeys - return minimal data without triggering full module load
        const knownJourneys: Record<string, JourneySpec> = {
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
        return knownJourneys[journeyId];
    }

    private resolvePath(obj: unknown, path: string): unknown {
        if (obj === null || obj === undefined) return undefined;
        const parts = path.split('.');
        let current: unknown = obj;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            if (typeof current === 'object' && current !== null) {
                current = (current as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }
        return current;
    }
}

export const journeySynthesizer = new JourneySynthesizer();

// Polyfill for expect (used in journey synthesis)
const expect = {
    any: (type: any) => ({ __expectAny: true, type }),
    arrayContaining: (arr: any[]) => ({ __expectArrayContaining: true, array: arr }),
    objectContaining: (obj: any) => ({ __expectObjectContaining: true, object: obj }),
};