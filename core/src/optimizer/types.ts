/**
 * Optimizer Config Types
 * Re-exports from sharedTypes.ts (single source of truth)
 */

export * from '../schemas/sharedTypes.js';

import type { OptimizerConfig, StrategyParamConfig } from '../schemas/sharedTypes.js';
import type { StrategyParamConfig as StrategyParamConfig2 } from '../constants/strategyParams.js';

// Re-export StrategyParamConfig from constants
export type { StrategyParamConfig } from '../constants/strategyParams.js';

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