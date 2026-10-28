import { DiscoveryEngine } from './index.js';
import { GoalParser, ParsedGoal, InferredAction } from './goalParser.js';
import { SelectorInference } from './selectorInference.js';
import type { JourneySpec, Step, Target } from '../journey.js';
import type { Note, AppSettings } from '@notention/core';
import type { Finding } from '../finding.js';
import { loadBundle } from '../replay.js';
import { getKnownJourney } from '../knownJourneys.js';
import { expect } from '../expectPolyfill.js';
import { resolvePath } from '../pathUtils.js';

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
            const value = resolvePath(snapshot.state, statePath);
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
        return getKnownJourney(journeyId);
    }
}

export const journeySynthesizer = new JourneySynthesizer();