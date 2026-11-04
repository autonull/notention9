/**
 * Base Budget Allocator Plugin
 * Shared base class for all budget allocation strategies
 */

import { z } from 'zod';
import type { OptimizerCandidate, CandidateEvaluationResult, BudgetConstraints, OptimizerConfig } from './candidateGenerators.js';
import { Plugin, ValidationHelpers } from '../utils/Registry.js';
import { BudgetAllocation, CandidateBudget, CandidateCost } from './budgetAllocators.js';

export abstract class BaseBudgetAllocator extends Plugin<BudgetConstraints> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly configSchema?: z.ZodSchema<BudgetConstraints> = undefined;

    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000 };
    }

    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.positiveInt(config.maxBrowserRuns, 'maxBrowserRuns'),
            ValidationHelpers.positiveInt(config.maxTimeMinutes, 'maxTimeMinutes'),
            ValidationHelpers.positiveInt(config.maxTokens, 'maxTokens'),
        );
    }

    /**
     * Default equal allocation helper - can be used by subclasses
     */
    protected equalAllocation(
        candidates: OptimizerCandidate[],
        budget: BudgetConstraints,
        config: OptimizerConfig
    ): BudgetAllocation {
        const candidateCount = candidates.length;
        const perCandidate = new Map<string, CandidateBudget>();

        const runsPerCandidate = Math.max(1, Math.floor((budget.maxBrowserRuns ?? config.maxBrowserRuns) / candidateCount));
        const timePerCandidate = (budget.maxTimeMinutes ?? config.maxTimeMinutes) / candidateCount;
        const tokensPerCandidate = Math.floor((budget.maxTokens ?? config.maxTokens) / candidateCount);

        for (const candidate of candidates) {
            perCandidate.set(candidate.id, {
                browserRuns: runsPerCandidate,
                timeMinutes: timePerCandidate,
                tokens: tokensPerCandidate,
            });
        }

        return {
            perCandidate,
            totalEstimatedCost: {
                browserRuns: runsPerCandidate * candidateCount,
                tokensUsed: tokensPerCandidate * candidateCount,
                durationMs: timePerCandidate * 60 * 1000 * candidateCount,
            },
            isFinalRound: true,
        };
    }

    /**
     * Sort results by primaryDelta descending (best first)
     */
    protected sortByPrimaryDelta(results: CandidateEvaluationResult[]): CandidateEvaluationResult[] {
        return [...results].sort((a, b) => b.primaryDelta - a.primaryDelta);
    }

    abstract allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints,
        previousResults: CandidateEvaluationResult[]
    ): BudgetAllocation;

    abstract promote(
        results: CandidateEvaluationResult[],
        config: OptimizerConfig
    ): string[];
}