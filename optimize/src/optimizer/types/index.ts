import type { ParamSpec, Seam } from '@notention/core/ui/strategy';
import type {
    OptimizerConfig,
    OptimizerCandidate,
    CandidateProvenance,
    CandidateEvaluationResult,
    CandidateCost,
    OptimizerResult,
    IntentEvaluationConfig,
    IntentEvaluationResult,
    BudgetConstraints,
    GeneratorOptions,
    StrategyParamConfig,
    OptimizerQualityRunConfig,
} from '@notention/core/optimizer';
import type { VerdictConfig } from '@notention/core/schemas/verdictTypes';
import { defaultOptimizerConfig as coreDefaultOptimizerConfig } from '@notention/core/optimizer';

// Re-export all types from core for single source of truth
export type {
    ParamSpec,
    Seam,
    OptimizerConfig,
    OptimizerCandidate,
    CandidateProvenance,
    CandidateEvaluationResult as CandidateEvaluation,
    CandidateCost,
    OptimizerResult,
    IntentEvaluationConfig,
    IntentEvaluationResult,
    VerdictConfig,
    BudgetConstraints,
    GeneratorOptions,
    StrategyParamConfig,
    OptimizerQualityRunConfig,
};

/**
 * Default optimizer configuration
 * Overrides core's default with optimize-specific defaults
 */
export function defaultOptimizerConfig(): OptimizerConfig {
    const coreConfig = coreDefaultOptimizerConfig();
    return {
        ...coreConfig,
        maxIntentCases: 10, // Optimize uses more cases for better statistical power
    };
}