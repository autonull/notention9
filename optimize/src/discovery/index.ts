export { ComponentScanner, scanner, type DiscoveryResult, type DiscoveredRoute, type DiscoveredDialog, type DiscoveredAction } from './componentScanner.js';
export { StateSchemaInferencer, stateSchemaInferencer, type InferredStateSchema, type StatePath } from './stateSchema.js';
export { TraceEmitterScanner, traceEmitterScanner, type TraceEmitter } from './traceEmitterScanner.js';
export { JourneyGenerator, journeyGenerator, type GenerationOptions } from './journeyGenerator.js';
export { SelectorInference, selectorInference, type InferredSelector } from './selectorInference.js';

// Unified discovery facade
import { ComponentScanner } from './componentScanner.js';
import { StateSchemaInferencer } from './stateSchema.js';
import { TraceEmitterScanner } from './traceEmitterScanner.js';
import { JourneyGenerator } from './journeyGenerator.js';
import { SelectorInference } from './selectorInference.js';
import type { JourneySpec } from '../journey.js';

export class DiscoveryEngine {
    private components = new ComponentScanner();
    private stateSchema = new StateSchemaInferencer();
    private traces = new TraceEmitterScanner();
    private journeys = new JourneyGenerator();
    private selectors = new SelectorInference();

    discoverAll(projectRoot: string = '/home/me/notention9') {
        const discovery = this.components.scan(projectRoot);
        const stateSchema = this.stateSchema.infer(projectRoot);
        const traceEmitters = this.traces.scan(projectRoot);
        const selectors = this.selectors.infer(discovery);

        return { discovery, stateSchema, traceEmitters, selectors };
    }

    generateJourney(name: string, projectRoot: string = '/home/me/notention9'): JourneySpec {
        return this.journeys.generate(name, { projectRoot });
    }

    generateFromIntent(intent: string, projectRoot: string = '/home/me/notention9'): JourneySpec | null {
        return this.journeys.generateFromIntent(intent, { projectRoot });
    }

    getSelectors(projectRoot: string = '/home/me/notention9') {
        const discovery = this.components.scan(projectRoot);
        return this.selectors.infer(discovery);
    }
}

export const discoveryEngine = new DiscoveryEngine();