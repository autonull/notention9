/**
 * Budget Allocator Plugins (R6)
 * Pluggable budget allocation strategies: fixed, successive halving, Hyperband
 */

import { z } from 'zod';
import type { OptimizerCandidate, CandidateEvaluationResult, BudgetConstraints } from './candidateGenerators.js';
import type { OptimizerConfig, BudgetAllocation, CandidateBudget, CandidateCost } from './types.js';
import { createInstanceRegistry, ValidationHelpers } from '../utils/Registry.js';
import { BaseBudgetAllocator } from './baseBudgetAllocator.js';

// --- Budget Allocator Interface ---

export interface BudgetAllocator {
    readonly name: string;
    readonly description: string;
    
    /**
     * Allocate budget across candidates for an optimization round
     * @param candidates - Candidates to evaluate
     * @param config - Optimizer configuration
     * @param budget - Total budget constraints
     * @param previousResults - Results from previous rounds (for adaptive allocators)
     * @returns Allocation plan per candidate
     */
    allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints,
        previousResults: CandidateEvaluationResult[]
    ): BudgetAllocation;
    
    /**
     * Determine which candidates to promote to next round
     * @param results - Evaluation results from current round
     * @param config - Optimizer configuration
     * @returns Candidate IDs to promote
     */
    promote(
        results: CandidateEvaluationResult[],
        config: OptimizerConfig
    ): string[];
    
    getDefaultConfig(): BudgetConstraints;
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] };
}

// --- Budget Allocator Registrable mixin ---
type RegistrableAllocator = BudgetAllocator & { getDefaultConfig(): BudgetConstraints; validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } };

// --- Fixed Budget Allocator (equal allocation) ---

export class FixedBudgetAllocator extends BaseBudgetAllocator {
    readonly name = 'fixed';
    readonly description = 'Equal budget allocation across all candidates';
    
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
    
    allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints
    ): BudgetAllocation {
        return this.equalAllocation(candidates, budget, config);
    }
    
    promote(results: CandidateEvaluationResult[], _config: OptimizerConfig): string[] {
        // In fixed budget, all candidates are evaluated equally, no promotion
        return results.map(r => r.candidateId);
    }
}

// --- Successive Halving Allocator ---

export class SuccessiveHalvingAllocator extends BaseBudgetAllocator {
    readonly name = 'successive-halving';
    readonly description = 'Successive halving: evaluate all on small budget, iteratively promote top fraction';
    
    constructor(
        private initialFraction = 0.25,
        private promotionFraction = 0.5,
        private minPromote = 2
    ) {
        super();
    }
    
    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000, initialFraction: 0.25, promotionFraction: 0.5, minPromote: 2 };
    }
    
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.numberInRange(config.initialFraction, 'initialFraction', 0, 1),
            ValidationHelpers.numberInRange(config.promotionFraction, 'promotionFraction', 0, 1),
            ValidationHelpers.positiveInt(config.minPromote, 'minPromote'),
        );
    }
    
    allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints,
        previousResults: CandidateEvaluationResult[]
    ): BudgetAllocation {
        const totalRuns = budget.maxBrowserRuns ?? config.maxBrowserRuns;
        const totalTime = budget.maxTimeMinutes ?? config.maxTimeMinutes;
        const totalTokens = budget.maxTokens ?? config.maxTokens;
        
        const round = previousResults.length > 0 ? this.getCurrentRound(previousResults) : 0;
        const remainingCandidates = this.getRemainingCandidates(candidates, previousResults, config);
        const candidateCount = remainingCandidates.length;
        
        if (candidateCount === 0) {
            return {
                perCandidate: new Map(),
                totalEstimatedCost: { browserRuns: 0, tokensUsed: 0, durationMs: 0 },
                isFinalRound: true,
            };
        }
        
        // Calculate budget for this round
        const runsPerCandidate = Math.max(1, Math.floor(totalRuns / candidateCount * Math.pow(this.initialFraction, round)));
        const timePerCandidate = totalTime / candidateCount * Math.pow(this.initialFraction, round);
        const tokensPerCandidate = Math.floor(totalTokens / candidateCount * Math.pow(this.initialFraction, round));
        
        const perCandidate = new Map<string, CandidateBudget>();
        for (const candidate of remainingCandidates) {
            perCandidate.set(candidate.id, {
                browserRuns: runsPerCandidate,
                timeMinutes: timePerCandidate,
                tokens: tokensPerCandidate,
                sliceFraction: Math.pow(this.initialFraction, round),
            });
        }
        
        const isFinalRound = candidateCount <= this.minPromote || round >= 4; // Max 5 rounds
        
        return {
            perCandidate,
            totalEstimatedCost: {
                browserRuns: runsPerCandidate * candidateCount,
                tokensUsed: tokensPerCandidate * candidateCount,
                durationMs: timePerCandidate * 60 * 1000 * candidateCount,
            },
            isFinalRound,
        };
    }
    
    promote(results: CandidateEvaluationResult[], _config: OptimizerConfig): string[] {
        const sorted = this.sortByPrimaryDelta(results);
        const promoteCount = Math.max(this.minPromote, Math.ceil(sorted.length * this.promotionFraction));
        return sorted.slice(0, promoteCount).map(r => r.candidateId);
    }
    
    private getCurrentRound(previousResults: CandidateEvaluationResult[]): number {
        return previousResults.length > 0 ? 1 : 0; // Simplified
    }
    
    private getRemainingCandidates(
        candidates: OptimizerCandidate[],
        previousResults: CandidateEvaluationResult[],
        config: OptimizerConfig
    ): OptimizerCandidate[] {
        if (previousResults.length === 0) return candidates;
        
        const promotedIds = this.promote(previousResults, config);
        return candidates.filter(c => promotedIds.includes(c.id));
    }
}

// --- Hyperband Allocator ---

export class HyperbandAllocator extends BaseBudgetAllocator {
    readonly name = 'hyperband';
    readonly description = 'Hyperband: multiple successive halving brackets with different resource levels';
    
    constructor(
        private maxResource = 81,      // Maximum budget per candidate (e.g., browser runs)
        private reductionFactor = 3    // η (eta) - reduction factor
    ) {
        super();
    }
    
    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000, maxResource: 81, reductionFactor: 3 };
    }
    
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.maxResource !== undefined) {
            const err = ValidationHelpers.positiveInt(config.maxResource, 'maxResource');
            if (err) errors.push(err);
        }
        if (config.reductionFactor !== undefined) {
            const err = ValidationHelpers.numberInRange(config.reductionFactor, 'reductionFactor', 2, Infinity);
            if (err) errors.push(err);
        }
        return { valid: errors.length === 0, errors };
    }
    
    allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints,
        previousResults: CandidateEvaluationResult[]
    ): BudgetAllocation {
        // Hyperband uses multiple brackets
        // For simplicity, implement single bracket successive halving with geometric progression
        const totalRuns = budget.maxBrowserRuns ?? config.maxBrowserRuns;
        const totalTime = budget.maxTimeMinutes ?? config.maxTimeMinutes;
        const totalTokens = budget.maxTokens ?? config.maxTokens;
        
        const sMax = Math.floor(Math.log(this.maxResource) / Math.log(this.reductionFactor));
        const bracket = this.selectBracket(sMax, previousResults);
        
        const n = Math.ceil((sMax + 1) / (bracket + 1) * Math.pow(this.reductionFactor, bracket));
        const r = this.maxResource * Math.pow(this.reductionFactor, -bracket);
        
        const runsPerCandidate = Math.max(1, Math.min(Math.floor(r), Math.floor(totalRuns / n)));
        const timePerCandidate = totalTime / n;
        const tokensPerCandidate = Math.floor(totalTokens / n);
        
        const perCandidate = new Map<string, CandidateBudget>();
        for (const candidate of candidates.slice(0, n)) {
            perCandidate.set(candidate.id, {
                browserRuns: runsPerCandidate,
                timeMinutes: timePerCandidate,
                tokens: tokensPerCandidate,
                sliceFraction: runsPerCandidate / this.maxResource,
            });
        }
        
        const isFinalRound = bracket === sMax && candidates.length <= 1;
        
        return {
            perCandidate,
            totalEstimatedCost: {
                browserRuns: runsPerCandidate * n,
                tokensUsed: tokensPerCandidate * n,
                durationMs: timePerCandidate * 60 * 1000 * n,
            },
            isFinalRound,
        };
    }
    
    promote(results: CandidateEvaluationResult[], _config: OptimizerConfig): string[] {
        const sorted = this.sortByPrimaryDelta(results);
        const promoteCount = Math.max(1, Math.ceil(sorted.length / this.reductionFactor));
        return sorted.slice(0, promoteCount).map(r => r.candidateId);
    }
    
    private selectBracket(sMax: number, previousResults: CandidateEvaluationResult[]): number {
        // Round-robin bracket selection
        return previousResults.length % (sMax + 1);
    }
}

// --- Budget Allocator Registry ---

const { registry: budgetAllocatorRegistry, get: getBudgetAllocatorRegistry, reset: resetBudgetAllocatorRegistry } = 
    createInstanceRegistry<RegistrableAllocator>('BudgetAllocator', [
        new FixedBudgetAllocator(),
        new SuccessiveHalvingAllocator(),
        new HyperbandAllocator(),
    ]);

// --- Singleton ---
export { budgetAllocatorRegistry, getBudgetAllocatorRegistry, resetBudgetAllocatorRegistry };