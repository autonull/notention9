/**
 * Optimizer Config Types
 * Single source of truth for optimizer types
 */

import type { StrategyParamConfig } from '../constants/strategyParams.js';
import type { ParamSpec } from '../schemas/paramSpec.js';

// Re-export StrategyParamConfig from constants
export type { StrategyParamConfig } from '../constants/strategyParams.js';

// --- Optimizer Types ---

export interface OptimizerConfig {
    targetSeams: string[];
    maxCandidatesPerSeam: number;
    maxBrowserRuns: number;
    maxTimeMinutes: number;
    maxTokens: number;
    useSuccessiveHalving: boolean;
    initialSliceFraction: number;
    minPromote: number;
    maxIntentCases?: number;
    useFrictionCandidates?: boolean;
}

export interface CandidateProvenance {
    generator: 'grid' | 'random' | 'model' | 'human' | 'friction';
    model?: string;
    seed?: number;
    parentRevisionId?: string;
    generatedAt: string;
    frictionProvenance?: {
        class: 'observed' | 'hypothesized' | 'measured' | 'asserted';
        source: 'journal' | 'simulator' | 'human' | 'model';
        kinds: string[];
        counts: Record<string, number>;
    };
}

export interface GeneratorOptions {
    maxCandidates: number;
    budget?: BudgetConstraints;
    seed?: number;
    previousCandidates?: OptimizerCandidate[];
    previousResults?: CandidateEvaluationResult[];
    initialFraction?: number;
    minPromote?: number;
    [key: string]: unknown;
}

export interface OptimizerCandidate {
    id: string;
    seamRole: string;
    strategyId: string;
    patch: Record<string, unknown>;
    paramSpec: ParamSpec;
    provenance: CandidateProvenance;
    evaluation?: CandidateEvaluationResult;
}

export interface CandidateEvaluationResult {
    candidateId: string;
    revisionId: string;
    qualityResults: OptimizerQualityRunConfig | null;
    intentResults?: IntentEvaluationResult;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryDelta: number;
    cost: CandidateCost;
}

export interface BudgetConstraints {
    maxBrowserRuns?: number;
    maxTimeMinutes?: number;
    maxTokens?: number;
    promotionFraction?: number;
    minPromote?: number;
    maxResource?: number;
    reductionFactor?: number;
    [key: string]: unknown;
}

// --- Budget Allocator Types ---

export interface BudgetAllocation {
    /** Budget allocated per candidate */
    perCandidate: Map<string, CandidateBudget>;
    /** Total estimated cost */
    totalEstimatedCost: CandidateCost;
    /** Whether this is the final round */
    isFinalRound: boolean;
}

export interface CandidateBudget {
    browserRuns: number;
    timeMinutes: number;
    tokens: number;
    sliceFraction?: number; // For successive halving
}

export interface CandidateCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

/** Alias for CandidateCost used in optimizer telemetry */
export type OptimizerCost = CandidateCost;

export interface OptimizerQualityRunConfig {
    repetitions?: number;
    extractionEngine?: unknown;
    matchEngine?: unknown;
    notes?: unknown[];
}

export interface IntentEvaluationConfig {
    baseURL?: string;
    headless?: boolean;
    userDataDir?: string;
    split?: 'search' | 'validation' | 'holdout';
    repetitions?: number;
    seed?: number;
    viewport?: { width: number; height: number };
    caseFilter?: string[];
    revisionPatch?: Record<string, unknown>;
}

export interface IntentEvaluationResult {
    runId: string;
    manifestHash: string;
    revisionId: string;
    split: string;
    results: Array<{
        caseId: string;
        intent: string;
        repetition: number;
        success: boolean;
        metrics: { completion: number; steps: number; corrections: number; timeToCaptureMs: number };
        details: string[];
        error?: string;
    }>;
    summary: {
        total: number;
        passed: number;
        failed: number;
        avgCompletion: number;
        avgSteps: number;
        avgCorrections: number;
        avgTimeToCaptureMs: number;
    };
}

export interface OptimizerResult {
    cycleId: string;
    timestamp: string;
    candidatesEvaluated: number;
    winners: OptimizerCandidate[];
    losers: OptimizerCandidate[];
    totalCost: CandidateCost;
    manifestHash: string;
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
        useFrictionCandidates: true,
    };
}