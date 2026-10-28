export { ComponentScanner, scanner, type DiscoveryResult, type DiscoveredRoute, type DiscoveredDialog, type DiscoveredAction } from './componentScanner.js';
export { StateSchemaInferencer, stateSchemaInferencer, type InferredStateSchema, type StatePath } from './stateSchema.js';
export { TraceEmitterScanner, traceEmitterScanner, type TraceEmitter } from './traceEmitterScanner.js';
export { JourneyGenerator, journeyGenerator, type GenerationOptions } from './journeyGenerator.js';
export { SelectorInference, selectorInference, type InferredSelector } from './selectorInference.js';
export { TsAstScanner, tsAstScanner, type ScannedType, type HookReturnType, type TypeSchemaData } from './tsAstScanner.js';
export { TypeSchemaBuilder, TypeSchema, type ResolvedType, type ResolvedProperty } from './typeSchema.js';
export { StatePathRegistry, getStatePathRegistry, setStatePathRegistry, type StatePathEntry, type StatePathInfo } from './statePathRegistry.js';
export { GoalParser, goalParser, type ParsedGoal, type TargetStatePredicate, type GoalConstraints, type InferredAction } from './goalParser.js';
export { JourneySynthesizer, journeySynthesizer, type SynthesisOptions } from './journeySynthesizer.js';
export { generateRegressionTest } from './regressionGenerator.js';
export { EventFlowScanner, eventFlowScanner, type EventHandler, type ActionFlow, type ActionCall } from './eventFlowScanner.js';
export { AccessibilitySelectorDeriver, deriveSelectorsFromPage, type AriaSnapshotOptions, type AccessibilitySelector, type LiveSelectorResult } from './accessibilitySelector.js';
export { McpContractScanner, mcpContractScanner, type McpToolContract, type McpPluginInfo } from './mcpContractScanner.js';
export { GoldenCaseMiner, goldenCaseMiner, type GoldenCase, type MiningOptions } from './goldenCaseMiner.js';

// Unified discovery facade
import { ComponentScanner } from './componentScanner.js';
import { StateSchemaInferencer } from './stateSchema.js';
import { TraceEmitterScanner } from './traceEmitterScanner.js';
import { JourneyGenerator } from './journeyGenerator.js';
import { SelectorInference } from './selectorInference.js';
import { TsAstScanner } from './tsAstScanner.js';
import { TypeSchemaBuilder } from './typeSchema.js';
import { StatePathRegistry } from './statePathRegistry.js';
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

    private defaultRoot(): string {
        return getProjectRoot();
    }

    discoverAll(projectRoot: string = this.defaultRoot()) {
        const discovery = this.components.scan(projectRoot);
        const stateSchema = this.stateSchema.infer(projectRoot);
        const traceEmitters = this.traces.scan(projectRoot);
        const selectors = this.selectors.infer(discovery);

        return { discovery, stateSchema, traceEmitters, selectors };
    }

    discoverWithTypes(projectRoot: string = this.defaultRoot()) {
        const base = this.discoverAll(projectRoot);
        const typeSchema = TypeSchemaBuilder.fromProject(projectRoot);
        this.typeSchema = typeSchema;
        this.statePathRegistry.merge(typeSchema.statePathRegistry);
        return { ...base, typeSchema, statePathRegistry: this.statePathRegistry };
    }

    generateJourney(name: string, projectRoot: string = this.defaultRoot()): JourneySpec {
        return this.journeys.generate(name, { projectRoot });
    }

    generateFromIntent(intent: string, projectRoot: string = this.defaultRoot()): JourneySpec | null {
        return this.journeys.generateFromIntent(intent, { projectRoot });
    }

    getSelectors(projectRoot: string = this.defaultRoot()) {
        const discovery = this.components.scan(projectRoot);
        return this.selectors.infer(discovery);
    }

    getStatePathRegistry(): StatePathRegistry {
        return this.statePathRegistry;
    }

    getTypeSchema() {
        return this.typeSchema;
    }
}

export const discoveryEngine = new DiscoveryEngine();