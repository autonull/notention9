/**
 * Budget Allocator Plugins (R6)
 * Pluggable budget allocation strategies: fixed, successive halving, Hyperband
 */

import { z } from 'zod';
import type { OptimizerCandidate, CandidateEvaluationResult, BudgetConstraints } from './candidateGenerators.js';
import type { OptimizerConfig } from './types.js';
import { PluginRegistry, createPluginRegistry } from '../utils/PluginRegistry.js';

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

// --- Fixed Budget Allocator (equal allocation) ---

export class FixedBudgetAllocator implements RegistrableAllocator {
    readonly name = 'fixed';
    readonly description = 'Equal budget allocation across all candidates';
    
    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000 };
    }
    
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.maxBrowserRuns !== undefined && (typeof config.maxBrowserRuns !== 'number' || config.maxBrowserRuns < 1)) {
            errors.push('maxBrowserRuns must be a positive number');
        }
        if (config.maxTimeMinutes !== undefined && (typeof config.maxTimeMinutes !== 'number' || config.maxTimeMinutes < 1)) {
            errors.push('maxTimeMinutes must be a positive number');
        }
        if (config.maxTokens !== undefined && (typeof config.maxTokens !== 'number' || config.maxTokens < 1)) {
            errors.push('maxTokens must be a positive number');
        }
        return { valid: errors.length === 0, errors };
    }
    
    allocate(
        candidates: OptimizerCandidate[],
        config: OptimizerConfig,
        budget: BudgetConstraints
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
    
    promote(results: CandidateEvaluationResult[], config: OptimizerConfig): string[] {
        // In fixed budget, all candidates are evaluated equally, no promotion
        return results.map(r => r.candidateId);
    }
}

// --- Successive Halving Allocator ---

export class SuccessiveHalvingAllocator implements RegistrableAllocator {
    readonly name = 'successive-halving';
    readonly description = 'Successive halving: evaluate all on small budget, iteratively promote top fraction';
    
    constructor(
        private initialFraction = 0.25,
        private promotionFraction = 0.5,
        private minPromote = 2
    ) {}
    
    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000, initialFraction: 0.25, promotionFraction: 0.5, minPromote: 2 };
    }
    
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.initialFraction !== undefined && (typeof config.initialFraction !== 'number' || config.initialFraction <= 0 || config.initialFraction > 1)) {
            errors.push('initialFraction must be between 0 and 1');
        }
        if (config.promotionFraction !== undefined && (typeof config.promotionFraction !== 'number' || config.promotionFraction <= 0 || config.promotionFraction > 1)) {
            errors.push('promotionFraction must be between 0 and 1');
        }
        if (config.minPromote !== undefined && (typeof config.minPromote !== 'number' || config.minPromote < 1)) {
            errors.push('minPromote must be a positive number');
        }
        return { valid: errors.length === 0, errors };
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
    
    promote(results: CandidateEvaluationResult[], config: OptimizerConfig): string[] {
        // Sort by primary delta descending (best first)
        const sorted = [...results].sort((a, b) => b.primaryDelta - a.primaryDelta);
        const promoteCount = Math.max(this.minPromote, Math.ceil(sorted.length * this.promotionFraction));
        return sorted.slice(0, promoteCount).map(r => r.candidateId);
    }
    
    private getCurrentRound(previousResults: CandidateEvaluationResult[]): number {
        // Determine round from slice fractions in previous results
        // For simplicity, assume each call to allocate is a new round
        return previousResults.length > 0 ? 1 : 0; // Simplified
    }
    
    private getRemainingCandidates(
        candidates: OptimizerCandidate[],
        previousResults: CandidateEvaluationResult[],
        config: OptimizerConfig
    ): OptimizerCandidate[] {
        if (previousResults.length === 0) return candidates;
        
        // Get promoted candidates from last round
        const promotedIds = this.promote(previousResults, config);
        return candidates.filter(c => promotedIds.includes(c.id));
    }
}

// --- Hyperband Allocator ---

export class HyperbandAllocator implements RegistrableAllocator {
    readonly name = 'hyperband';
    readonly description = 'Hyperband: multiple successive halving brackets with different resource levels';
    
    constructor(
        private maxResource = 81,      // Maximum budget per candidate (e.g., browser runs)
        private reductionFactor = 3    // η (eta) - reduction factor
    ) {}
    
    getDefaultConfig(): BudgetConstraints {
        return { maxBrowserRuns: 160, maxTimeMinutes: 30, maxTokens: 150000, maxResource: 81, reductionFactor: 3 };
    }
    
    validateConfig(config: BudgetConstraints): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.maxResource !== undefined && (typeof config.maxResource !== 'number' || config.maxResource < 1)) {
            errors.push('maxResource must be a positive number');
        }
        if (config.reductionFactor !== undefined && (typeof config.reductionFactor !== 'number' || config.reductionFactor < 2)) {
            errors.push('reductionFactor must be at least 2');
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
        
        const isFinalRound = bracket === sMax && candidates.length <= this.minPromote;
        
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
    
    promote(results: CandidateEvaluationResult[], config: OptimizerConfig): string[] {
        const sorted = [...results].sort((a, b) => b.primaryDelta - a.primaryDelta);
        const promoteCount = Math.max(1, Math.ceil(sorted.length / this.reductionFactor));
        return sorted.slice(0, promoteCount).map(r => r.candidateId);
    }
    
    private minPromote = 1;
    
    private selectBracket(sMax: number, previousResults: CandidateEvaluationResult[]): number {
        // Round-robin bracket selection
        return previousResults.length % (sMax + 1);
    }
}

// --- Budget Allocator Registry ---

const { registry: budgetAllocatorRegistry, get: getBudgetAllocatorRegistry, reset: resetBudgetAllocatorRegistry } = 
    createPluginRegistry<RegistrableAllocator>('BudgetAllocator', [
        new FixedBudgetAllocator(),
        new SuccessiveHalvingAllocator(),
        new HyperbandAllocator(),
    ]);

// --- Singleton ---
export { budgetAllocatorRegistry, getBudgetAllocatorRegistry, resetBudgetAllocatorRegistry };