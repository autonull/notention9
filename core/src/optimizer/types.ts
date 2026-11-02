/**
 * Optimizer Config Types
 * Local type definitions to avoid cross-package dependencies
 */

import type { ParamSpec, Seam } from '../ui/strategy.js';

/**
 * Strategy parameter configuration from core
 * Re-exported from constants/strategyParams
 */
export interface StrategyParamConfig {
    id: string;
    seam: Seam;
    version: string;
    defaultProps: Record<string, unknown>;
    paramSpec: ParamSpec;
}

/**
 * Configuration for a single optimization cycle
 */
export interface OptimizerConfig {
    /** Target seam roles to optimize (default: ['capture', 'match']) */
    targetSeams: string[];
    /** Maximum candidates per seam to evaluate */
    maxCandidatesPerSeam: number;
    /** Total browser run budget */
    maxBrowserRuns: number;
    /** Maximum time budget in minutes */
    maxTimeMinutes: number;
    /** Maximum tokens for LLM generation (if used) */
    maxTokens: number;
    /** Successive halving: evaluate all on slice, promote top half */
    useSuccessiveHalving: boolean;
    /** Initial slice fraction (0-1) */
    initialSliceFraction: number;
    /** Minimum candidates to promote */
    minPromote: number;
    /** Maximum intent cases to use (for faster test runs) */
    maxIntentCases?: number;
}

/**
 * Default optimizer configuration
 */
export function defaultOptimizerConfig(): OptimizerConfig {
    return {
        targetSeams: ['capture', 'match'],
        maxCandidatesPerSeam: 8,
        maxBrowserRuns: 160,
        maxTimeMinutes: 30,
        maxTokens: 150000,
        useSuccessiveHalving: true,
        initialSliceFraction: 0.25,
        minPromote: 2,
        maxIntentCases: 2,
    };
}

/**
 * A candidate strategy with its proposed parameter patch
 */
export interface OptimizerCandidate {
    id: string;
    seamRole: string;
    strategyId: string;
    /** Parameter patch to apply on top of incumbent */
    patch: Record<string, unknown>;
    /** Parameter specification for validation */
    paramSpec: ParamSpec;
    /** Generation provenance */
    provenance: CandidateProvenance;
    /** Evaluation results (populated after run) */
    evaluation?: CandidateEvaluationResult;
}

/**
 * How this candidate was generated
 */
export interface CandidateProvenance {
    generator: 'grid' | 'random' | 'model' | 'human';
    model?: string;
    seed?: number;
    parentRevisionId?: string;
    generatedAt: string;
}

/**
 * Options for candidate generation
 */
export interface GeneratorOptions {
    maxCandidates: number;
    budget?: BudgetConstraints;
    seed?: number;
    previousCandidates?: OptimizerCandidate[];
    previousResults?: CandidateEvaluationResult[];
}

/**
 * Evaluation result for a candidate
 */
export interface CandidateEvaluationResult {
    candidateId: string;
    revisionId: string;
    qualityResults: any;
    intentResults?: any;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryDelta: number;
    cost: { browserRuns: number; tokensUsed: number; durationMs: number };
}

/**
 * Budget constraints for candidate generation
 */
export interface BudgetConstraints {
    maxBrowserRuns?: number;
    maxTimeMinutes?: number;
    maxTokens?: number;
}