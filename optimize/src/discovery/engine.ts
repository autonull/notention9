/**
 * Unified discovery facade.
 *
 * Lives outside the `discovery/index.ts` barrel on purpose: the barrel re-exports
 * the synthesizer modules, and those import `DiscoveryEngine` back. When the class
 * lived in the barrel, that cycle resolved to a temporal dead zone — importing
 * `@notention/optimize` threw "Cannot access 'DiscoveryEngine' before initialization"
 * and every optimize journey test silently ran zero tests.
 *
 * @see doc/decisions/015-telemetry-handoff.md
 */
import { ComponentScanner } from './scanner/componentScanner.js';
import { StateSchemaInferencer } from './scanner/stateSchema.js';
import { TraceEmitterScanner } from './scanner/traceEmitterScanner.js';
import { JourneyGenerator } from './synthesizer/journeyGenerator.js';
import { SelectorInference } from './analyzer/selectorInference.js';
import { TsAstScanner } from './scanner/tsAstScanner.js';
import { TypeSchemaBuilder } from './scanner/typeSchema.js';
import { StatePathRegistry } from './analyzer/statePathRegistry.js';
import type { JourneySpec } from '../journey.js';
import { getProjectRoot } from '../config.js';

export class DiscoveryEngine {
    private components = new ComponentScanner();
    private stateSchema = new StateSchemaInferencer();
    private traces = new TraceEmitterScanner();
    private journeys = new JourneyGenerator();
    private selectors = new SelectorInference();
    private tsScanner = new TsAstScanner();
    private typeSchema: ReturnType<TypeSchemaBuilder['build']> | null = null;
    private statePathRegistry = new StatePathRegistry();

    private defaultRoot(importMetaUrl: string): string {
        return getProjectRoot(importMetaUrl);
    }

    discoverAll(projectRoot?: string, importMetaUrl?: string) {
        const root = projectRoot ?? this.defaultRoot(importMetaUrl ?? import.meta.url);
        const discovery = this.components.scan(root);
        const stateSchema = this.stateSchema.infer(root);
        const traceEmitters = this.traces.scan(root);
        const selectors = this.selectors.infer(discovery);

        return { discovery, stateSchema, traceEmitters, selectors };
    }

    discoverWithTypes(projectRoot?: string, importMetaUrl?: string) {
        const root = projectRoot ?? this.defaultRoot(importMetaUrl ?? import.meta.url);
        const base = this.discoverAll(root);
        const typeSchema = TypeSchemaBuilder.fromProject(root);
        this.typeSchema = typeSchema;
        this.statePathRegistry.merge(typeSchema.statePathRegistry);
        return { ...base, typeSchema, statePathRegistry: this.statePathRegistry };
    }

    generateJourney(name: string, projectRoot?: string, importMetaUrl?: string): JourneySpec {
        const root = projectRoot ?? this.defaultRoot(importMetaUrl ?? import.meta.url);
        return this.journeys.generate(name, { projectRoot: root });
    }

    generateFromIntent(intent: string, projectRoot?: string, importMetaUrl?: string): JourneySpec | null {
        const root = projectRoot ?? this.defaultRoot(importMetaUrl ?? import.meta.url);
        return this.journeys.generateFromIntent(intent, { projectRoot: root });
    }

    getSelectors(projectRoot?: string, importMetaUrl?: string) {
        const root = projectRoot ?? this.defaultRoot(importMetaUrl ?? import.meta.url);
        const discovery = this.components.scan(root);
        return this.selectors.infer(discovery);
    }

    getStatePathRegistry(): StatePathRegistry {
        return this.statePathRegistry;
    }

    getTypeSchema() {
        return this.typeSchema;
    }
}
