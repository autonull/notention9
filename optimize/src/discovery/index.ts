// Scanner exports
export {
    ComponentScanner,
    scanner,
    type DiscoveryResult,
    type DiscoveredRoute,
    type DiscoveredDialog,
    type DiscoveredAction,
    type ComponentInfo,
    type PropInfo,
    type JSXElement,
    type FieldInfo,
    type SelectorInfo,
} from './scanner/componentScanner.js';

export { createAstProject, findProjectRoot, DEFAULT_PROJECT_ROOT } from './scanner/astProject.js';
export {
    StateSchemaInferencer,
    stateSchemaInferencer,
    type InferredStateSchema,
    type StatePath,
    type HookState,
} from './scanner/stateSchema.js';

export {
    TraceEmitterScanner,
    traceEmitterScanner,
    type TraceEmitter,
} from './scanner/traceEmitterScanner.js';

export {
    TsAstScanner,
    tsAstScanner,
    type ScannedType,
    type HookReturnType,
    type TypeSchemaData,
} from './scanner/tsAstScanner.js';

export {
    TypeSchemaBuilder,
    TypeSchema,
    type ResolvedType,
    type ResolvedProperty,
} from './scanner/typeSchema.js';

export {
    AccessibilitySelectorDeriver,
    deriveSelectorsFromPage,
    type AriaSnapshotOptions,
    type AccessibilitySelector,
    type LiveSelectorResult,
} from './scanner/accessibilitySelector.js';

export {
    McpContractScanner,
    mcpContractScanner,
    type McpToolContract,
    type McpPluginInfo,
} from './scanner/mcpContractScanner.js';

// Analyzer exports
export {
    discoverSeams,
    type Seam,
} from './analyzer/seamAnalyzer.js';

export {
    analyzeDuplicates,
    type DiscoveryAnalysis,
    type DuplicateGroup,
    type DeadComponent,
    type InlinedCandidate,
} from './analyzer/duplicateAnalyzer.js';

export {
    EventFlowScanner,
    eventFlowScanner,
    type EventHandler,
    type ActionFlow,
    type ActionCall,
} from './analyzer/eventFlowScanner.js';

export {
    StatePathRegistry,
    getStatePathRegistry,
    setStatePathRegistry,
    type StatePathEntry,
    type StatePathInfo,
} from './analyzer/statePathRegistry.js';

export {
    SelectorInference,
    selectorInference,
    type InferredSelector,
} from './analyzer/selectorInference.js';

export {
    OntologyAdapter,
    type OntologyData,
    type OntologyProperty,
} from './analyzer/ontologyAdapter.js';

// Synthesizer exports
export {
    JourneySynthesizer,
    journeySynthesizer,
    type SynthesisOptions,
} from './synthesizer/journeySynthesizer.js';

export {
    GoalParser,
    goalParser,
    type ParsedGoal,
    type TargetStatePredicate,
    type GoalConstraints,
    type InferredAction,
} from './synthesizer/goalParser.js';

export {
    JourneyGenerator,
    journeyGenerator,
    type GenerationOptions,
} from './synthesizer/journeyGenerator.js';

export {
    generateJourneyId,
    generateIntent,
    inferJourneysTouched,
} from './synthesizer/intentBuilder.js';

export {
    buildSteps,
    resolveSelector,
    type StepBuilderOptions,
} from './synthesizer/stepBuilder.js';

export {
    buildSeed,
    type SeedBuilderOptions,
} from './synthesizer/seedBuilder.js';

// Testgen exports
export {
    GoldenCaseMiner,
    goldenCaseMiner,
    type GoldenCase,
    type MiningOptions,
} from './testgen/goldenCaseMiner.js';

export {
    generateRegressionTest,
} from './testgen/regressionGenerator.js';

export {
    journeyToSimulatorScenario,
    findingToSimulatorScenario,
} from './testgen/simulatorScenarioGenerator.js';

// Unified discovery facade
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