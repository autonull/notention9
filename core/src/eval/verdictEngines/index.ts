/**
 * VerdictEngine Interface + Registry (E1)
 * Pluggable statistical verdict computation: McNemar, Bayesian, Sequential, LLM-judge, Human-judge
 */

import { z } from 'zod';
import type { 
    CaseVerdict, 
    RunVerdict, 
    MetricVerdict, 
    PairedRunResult, 
    VerdictConfig 
} from '../verdict.js';
import type { ExtendedCaseVerdict, ExtendedRunVerdict, ExtendedMetricVerdict } from '../../schemas/verdictResult.js';
import type { EvidenceClass, JudgeProvenance } from '../../schemas/evidence.js';
import { McNemarVerdictEngine } from './mcnemar.js';
import { BayesianVerdictEngine } from './bayesian.js';
import { SequentialVerdictEngine } from './sequential.js';
import { LLMJudgeVerdictEngine } from './llmJudge.js';
import { HumanJudgeVerdictEngine } from './humanJudge.js';

// --- VerdictEngine Interface ---

export interface VerdictEngineConfig {
    primaryMetric: string;
    mde: Record<string, number>;
    floors: Record<string, number>;
    minSampleSize: number;
    // Engine-specific config
    [key: string]: unknown;
}

export interface VerdictEngine {
    readonly name: string;
    readonly description: string;
    readonly evidenceClass: EvidenceClass;
    readonly configSchema?: z.ZodSchema;
    
    /**
     * Compute case verdict from paired run results
     */
    computeCaseVerdict(
        caseId: string,
        paired: PairedRunResult,
        config: VerdictEngineConfig
    ): ExtendedCaseVerdict | Promise<ExtendedCaseVerdict>;
    
    /**
     * Compute run verdict from case verdicts
     */
    computeRunVerdict(
        runId: string,
        manifestHash: string,
        revisionId: string,
        baselineRevisionId: string,
        caseVerdicts: ExtendedCaseVerdict[],
        primaryMetric: string
    ): ExtendedRunVerdict | Promise<ExtendedRunVerdict>;
    
    /**
     * Get default configuration for this engine
     */
    getDefaultConfig(): VerdictEngineConfig;
    
    /**
     * Validate engine-specific configuration
     */
    validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] };
}

// --- Engine Registry ---

export class VerdictEngineRegistry {
    private engines = new Map<string, VerdictEngine>();
    
    constructor() {
        // Register built-in engines
        this.register(new McNemarVerdictEngine());
        this.register(new BayesianVerdictEngine());
        this.register(new SequentialVerdictEngine());
        this.register(new LLMJudgeVerdictEngine());
        this.register(new HumanJudgeVerdictEngine());
    }
    
    register(engine: VerdictEngine): void {
        if (this.engines.has(engine.name)) {
            throw new Error(`VerdictEngine '${engine.name}' already registered`);
        }
        this.engines.set(engine.name, engine);
    }
    
    unregister(name: string): boolean {
        return this.engines.delete(name);
    }
    
    get(name: string): VerdictEngine | undefined {
        return this.engines.get(name);
    }
    
    getAll(): VerdictEngine[] {
        return Array.from(this.engines.values());
    }
    
    listNames(): string[] {
        return Array.from(this.engines.keys());
    }
    
    has(name: string): boolean {
        return this.engines.has(name);
    }
}

// --- Re-export engines ---
export { McNemarVerdictEngine, type VerdictEngineConfig as McNemarConfig } from './mcnemar.js';
export { BayesianVerdictEngine, type VerdictEngineConfig as BayesianConfig } from './bayesian.js';
export { SequentialVerdictEngine, type VerdictEngineConfig as SequentialConfig } from './sequential.js';
export { LLMJudgeVerdictEngine, type VerdictEngineConfig as LLMJudgeConfig } from './llmJudge.js';
export { HumanJudgeVerdictEngine, type VerdictEngineConfig as HumanJudgeConfig, type HumanReview } from './humanJudge.js';

// --- Singleton instance ---
let verdictEngineRegistryInstance: VerdictEngineRegistry | null = null;

export function getVerdictEngineRegistry(): VerdictEngineRegistry {
    if (!verdictEngineRegistryInstance) {
        verdictEngineRegistryInstance = new VerdictEngineRegistry();
    }
    return verdictEngineRegistryInstance;
}

export function resetVerdictEngineRegistry(): void {
    verdictEngineRegistryInstance = null;
}