/**
 * Optimizer Config Types
 * Re-exports from sharedTypes.ts (single source of truth)
 */

export * from '../schemas/sharedTypes.js';

import type { OptimizerConfig, StrategyParamConfig } from '../schemas/sharedTypes.js';
import type { StrategyParamConfig as StrategyParamConfig2 } from '../constants/strategyParams.js';

// Re-export StrategyParamConfig from constants
export type { StrategyParamConfig } from '../constants/strategyParams.js';

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