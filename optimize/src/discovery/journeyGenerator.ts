import { ComponentScanner, DiscoveryResult, DiscoveredRoute, DiscoveredDialog, DiscoveredAction } from './componentScanner.js';
import { StateSchemaInferencer, InferredStateSchema } from './stateSchema.js';
import { TraceEmitterScanner, TraceEmitter } from './traceEmitterScanner.js';
import type { JourneySpec, Step } from '../journey.js';

export class JourneyGenerator {
    private components: ComponentScanner;
    private stateSchema: StateSchemaInferencer;
    private traceScanner: TraceEmitterScanner;

    constructor() {
        this.components = new ComponentScanner();
        this.stateSchema = new StateSchemaInferencer();
        this.traceScanner = new TraceEmitterScanner();
    }

    generate(journeyName: string, options: GenerationOptions = {}): JourneySpec {
        const discovery = this.components.scan(options.projectRoot);
        const stateSchema = this.stateSchema.infer(options.projectRoot);
        const traceEmitters = this.traceScanner.scan(options.projectRoot);

        // Find the journey pattern
        const journey = this.matchJourney(journeyName, discovery, stateSchema, traceEmitters);

        if (!journey) {
            throw new Error(`No journey pattern found for: ${journeyName}`);
        }

        return journey;
    }

    private matchJourney(
        name: string,
        discovery: DiscoveryResult,
        stateSchema: InferredStateSchema,
        traceEmitters: TraceEmitter[]
    ): JourneySpec | null {
        switch (name) {
            case 'capture-and-edit':
                return this.generateCaptureAndEdit(discovery, stateSchema, traceEmitters);
            case 'publish-gate':
                return this.generatePublishGate(discovery, stateSchema, traceEmitters);
            case 'ontology-conflict':
                return this.generateOntologyConflict(discovery, stateSchema, traceEmitters);
            default:
                return null;
        }
    }

    private generateCaptureAndEdit(
        discovery: DiscoveryResult,
        stateSchema: InferredStateSchema,
        traceEmitters: TraceEmitter[]
    ): JourneySpec {
        const steps: Step[] = [
            // Seed is handled by fixture, not a journey step
            {
                kind: 'navigate',
                hash: 'notes/scene-editor-note',
            },
            {
                kind: 'assertState',
                path: 'note.propertyIndex.skill',
                equals: ['React', 'TypeScript'],
            },
            // Open property palette
            {
                kind: 'act',
                target: { role: 'button', name: 'Add detail' },
                action: 'click',
            },
            // Fill property form
            {
                kind: 'act',
                target: { label: 'Detail' },
                action: 'fill',
                value: 'framework',
            },
            {
                kind: 'act',
                target: { label: 'Comparison' },
                action: 'fill',
                value: 'contains',
            },
            {
                kind: 'act',
                target: { label: 'Value' },
                action: 'fill',
                value: 'Next.js',
            },
            {
                kind: 'act',
                target: { role: 'button', name: 'Add detail' },
                action: 'click',
            },
            // Assert property added
            {
                kind: 'assertState',
                path: 'note.propertyIndex.framework',
                equals: ['Next.js'],
            },
            // Assert clean editor content
            {
                kind: 'assertState',
                path: 'editor.dirty',
                equals: true,
            },
            // Reload and assert persistence
            {
                kind: 'navigate',
                hash: 'notes/scene-editor-note',
            },
            {
                kind: 'assertState',
                path: 'note.propertyIndex.skill',
                equals: ['React', 'TypeScript'],
            },
            {
                kind: 'assertState',
                path: 'note.propertyIndex.framework',
                equals: ['Next.js'],
            },
            {
                kind: 'assertNoConsoleErrors',
            },
        ];

        return {
            id: 'capture-and-edit',
            version: 1,
            intent: 'Capture a note and add a structured property detail',
            journeysTouched: ['note-capture', 'property-editing', 'persistence'],
            seed: {
                notes: [{
                    id: 'scene-editor-note',
                    title: 'Scene Editor Note',
                    content: 'Working on the scene editor with React and TypeScript',
                    tags: ['development'],
                    properties: [
                        { key: 'skill', operator: 'contains', values: ['React', 'TypeScript'] },
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                    privacy: 'private',
                    priority: 1,
                }],
                settings: {
                    ontology: [],
                    aiEnabled: false,
                    aiProvider: 'local',
                    aiModel: '',
                    googleGeminiApiKey: '',
                    theme: 'dark',
                },
            },
            steps,
            status: 'ready',
        };
    }

    private generatePublishGate(
        discovery: DiscoveryResult,
        stateSchema: InferredStateSchema,
        traceEmitters: TraceEmitter[]
    ): JourneySpec {
        const steps: Step[] = [
            {
                kind: 'navigate',
                hash: 'notes/private-note-for-publish',
            },
            {
                kind: 'act',
                target: { role: 'button', name: 'Publish' },
                action: 'click',
            },
            {
                kind: 'assertState',
                path: 'pendingConfirmations',
                equals: [{ action: 'publish', consequence: 'note will become public' }],
            },
            {
                kind: 'assertState',
                path: 'traces.action[?(@.intent==\"note.publish\")].outcome',
                equals: 'requires_confirmation',
            },
            {
                kind: 'act',
                target: { role: 'button', name: 'Cancel' },
                action: 'click',
            },
            {
                kind: 'assertState',
                path: 'note.privacy',
                equals: 'private',
            },
        ];

        return {
            id: 'publish-gate',
            version: 1,
            intent: 'Verify publish confirmation gate for private notes',
            journeysTouched: ['publishing', 'privacy-gate'],
            seed: {
                notes: [{
                    id: 'private-note-for-publish',
                    title: 'Private Note',
                    content: 'This note is private and should not be published without confirmation',
                    tags: ['test'],
                    properties: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                    privacy: 'private',
                    priority: 1,
                }],
                settings: {
                    ontology: [],
                    aiEnabled: false,
                    aiProvider: 'local',
                    aiModel: '',
                    googleGeminiApiKey: '',
                    theme: 'dark',
                },
            },
            steps,
            status: 'ready',
        };
    }

    private generateOntologyConflict(
        discovery: DiscoveryResult,
        stateSchema: InferredStateSchema,
        traceEmitters: TraceEmitter[]
    ): JourneySpec {
        const steps: Step[] = [
            {
                kind: 'navigate',
                hash: 'notes/ontology-conflict-note',
            },
            {
                kind: 'assertState',
                path: 'note.propertyIndex.status',
                equals: ['pending'],
            },
            // TODO: Add conflict resolution steps
        ];

        return {
            id: 'ontology-conflict',
            version: 1,
            intent: 'Test ontology conflict detection and resolution',
            journeysTouched: ['ontology', 'property-validation'],
            seed: {
                notes: [{
                    id: 'ontology-conflict-note',
                    title: 'Ontology Conflict Note',
                    content: 'This note has properties that conflict with ontology definitions',
                    tags: ['test'],
                    properties: [
                        { key: 'status', operator: 'is', values: ['pending'] },
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
                    privacy: 'private',
                    priority: 1,
                }],
                settings: {
                    ontology: [
                        {
                            id: 'task',
                            label: 'Task',
                            attributes: {
                                status: { type: 'enum', operators: { real: ['is', 'is not'], imaginary: [] } },
                            },
                        },
                    ],
                    aiEnabled: false,
                    aiProvider: 'local',
                    aiModel: '',
                    googleGeminiApiKey: '',
                    theme: 'dark',
                },
            },
            steps,
            status: 'draft',
        };
    }

    // Generate a journey from a natural language description
    generateFromIntent(intent: string, options: GenerationOptions = {}): JourneySpec | null {
        // Simple keyword matching for now - can be enhanced with LLM
        const lower = intent.toLowerCase();

        if (lower.includes('capture') && lower.includes('edit')) {
            return this.generateCaptureAndEdit(
                this.components.scan(options.projectRoot),
                this.stateSchema.infer(options.projectRoot),
                this.traceScanner.scan(options.projectRoot)
            );
        }

        if (lower.includes('publish') && (lower.includes('gate') || lower.includes('private'))) {
            return this.generatePublishGate(
                this.components.scan(options.projectRoot),
                this.stateSchema.infer(options.projectRoot),
                this.traceScanner.scan(options.projectRoot)
            );
        }

        if (lower.includes('ontology') && lower.includes('conflict')) {
            return this.generateOntologyConflict(
                this.components.scan(options.projectRoot),
                this.stateSchema.infer(options.projectRoot),
                this.traceScanner.scan(options.projectRoot)
            );
        }

        return null;
    }
}

export interface GenerationOptions {
    projectRoot?: string;
    includeTraceAssertions?: boolean;
    includeAriaAssertions?: boolean;
}

export const journeyGenerator = new JourneyGenerator();