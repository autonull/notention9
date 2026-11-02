import { type ParamSpec, type Seam } from '@notention/core/ui/strategy';

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
    evaluation?: CandidateEvaluation;
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
 * Evaluation result for a candidate
 */
export interface CandidateEvaluation {
    candidateId: string;
    revisionId: string;
    qualityResults: QualityRunConfig | null; // Null per-candidate (UI params don't affect core quality)
    intentResults?: any;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryDelta: number;
    cost: CandidateCost;
}

/**
 * Cost accounting for a candidate evaluation
 */
export interface CandidateCost {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
}

/**
 * Optimizer result summary
 */
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
 * Configuration for quality evaluation run
 */
export interface QualityRunConfig {
    repetitions?: number;
    extractionEngine?: any;
    matchEngine?: any;
    notes?: any[];
}

/**
 * Configuration for intent evaluation
 */
export interface IntentEvaluationConfig {
    baseURL?: string;
    headless?: boolean;
    split?: 'search' | 'validation' | 'holdout';
    repetitions?: number;
    seed?: number;
    viewport?: { width: number; height: number };
    caseFilter?: string[];
    /** Revision parameter patch to apply in the browser */
    revisionPatch?: Record<string, unknown>;
}

/**
 * Intent evaluation result
 */
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
        metrics: { completion: number; steps: number; corrections: number };
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
    };
}

/**
 * Strategy parameter configuration from core
 */
export interface StrategyParamConfig {
    seam: Seam;
    id: string;
    paramSpec: ParamSpec;
    defaultProps: Record<string, unknown>;
}

/**
 * Verdict configuration for statistical comparison
 */
export interface VerdictConfig {
    primaryMetric: string;
    mde: Record<string, number>;
    floors: { schemaValidity: number };
    minSampleSize: number;
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