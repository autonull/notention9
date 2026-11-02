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
import { Registry, createSingletonRegistry } from '../../utils/Registry.js';

// --- VerdictEngine Config ---

export interface VerdictEngineConfig {
    primaryMetric: string;
    mde: Record<string, number>;
    floors: Record<string, number>;
    minSampleSize: number;
    // Engine-specific config
    [key: string]: unknown;
}

// --- VerdictEngine Interface ---

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

// --- VerdictEngine Registrable mixin ---
type RegistrableVerdictEngine = VerdictEngine & { getDefaultConfig(): VerdictEngineConfig; validateConfig(config: VerdictEngineConfig): { valid: boolean; errors: string[] } };

// --- Engine Registry ---

export const verdictEngineRegistry = new Registry<RegistrableVerdictEngine>({
    errorPrefix: 'VerdictEngineRegistry',
});

// Register built-in engines
verdictEngineRegistry.register(new McNemarVerdictEngine());
verdictEngineRegistry.register(new BayesianVerdictEngine());
verdictEngineRegistry.register(new SequentialVerdictEngine());
verdictEngineRegistry.register(new LLMJudgeVerdictEngine());
verdictEngineRegistry.register(new HumanJudgeVerdictEngine());

// --- Re-export engines ---
export { McNemarVerdictEngine, type VerdictEngineConfig as McNemarConfig } from './mcnemar.js';
export { BayesianVerdictEngine, type VerdictEngineConfig as BayesianConfig } from './bayesian.js';
export { SequentialVerdictEngine, type VerdictEngineConfig as SequentialConfig } from './sequential.js';
export { LLMJudgeVerdictEngine, type VerdictEngineConfig as LLMJudgeConfig } from './llmJudge.js';
export { HumanJudgeVerdictEngine, type VerdictEngineConfig as HumanJudgeConfig, type HumanReview } from './humanJudge.js';

// --- Re-export extended types from schemas ---
export type { ExtendedCaseVerdict, ExtendedRunVerdict, ExtendedMetricVerdict } from '../../schemas/verdictResult.js';
export type { EvidenceClass, JudgeProvenance } from '../../schemas/evidence.js';

// --- Singleton instance ---
const { get: getVerdictEngineRegistry, reset: resetVerdictEngineRegistry } = createSingletonRegistry(
    () => verdictEngineRegistry
);

export { getVerdictEngineRegistry, resetVerdictEngineRegistry };