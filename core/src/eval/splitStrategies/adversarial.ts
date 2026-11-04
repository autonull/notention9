/**
 * Adversarial Split Strategy - Hard cases in validation/holdout
 * Puts challenging cases (low completion, high corrections) in test splits
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategyConfig } from './index.js';
import { BaseSplitStrategy } from './baseSplitStrategy.js';
import { validateRatiosSumToOne } from '../../utils/common.js';

// --- Adversarial Split config schema ---
export const adversarialSplitConfigSchema = z.object({
    seed: z.number().int().default(42),
    searchRatio: z.number().min(0).max(1).default(0.6),
    validationRatio: z.number().min(0).max(1).default(0.2),
    holdoutRatio: z.number().min(0).max(1).default(0.2),
    // Difficulty metrics to use for ranking
    difficultyMetrics: z.array(z.enum(['completion', 'steps', 'corrections', 'complexity'])).default(['completion', 'corrections']),
    // Direction: 'hard-to-validation' (hard cases in val/holdout) or 'hard-to-search' (for curriculum)
    direction: z.enum(['hard-to-validation', 'hard-to-search']).default('hard-to-validation'),
    // Historical performance data (caseId -> metric values)
    historicalData: z.record(z.record(z.number())).optional(),
});

export class AdversarialSplitStrategy extends BaseSplitStrategy {
    readonly name = 'adversarial';
    readonly description = 'Adversarial split: difficult cases in validation/holdout to stress-test candidates';
    readonly configSchema = adversarialSplitConfigSchema;
    
    getDefaultConfig(): SplitStrategyConfig {
        return {
            seed: 42,
            searchRatio: 0.6,
            validationRatio: 0.2,
            holdoutRatio: 0.2,
            difficultyMetrics: ['completion', 'corrections'],
            direction: 'hard-to-validation',
        };
    }
    
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        const result = adversarialSplitConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        const cfg = result.data;
        return validateRatiosSumToOne(cfg.searchRatio, cfg.validationRatio, cfg.holdoutRatio);
    }
    
    splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } {
        const cfg = adversarialSplitConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        // Compute difficulty score for each case
        const scoredCases = cases.map(c => ({
            case: c,
            difficulty: this.computeDifficulty(c, cfg),
        }));
        
        // Sort by difficulty
        scoredCases.sort((a, b) => {
            if (cfg.direction === 'hard-to-validation') {
                return b.difficulty - a.difficulty; // Hardest first
            } else {
                return a.difficulty - b.difficulty; // Easiest first
            }
        });
        
        const n = scoredCases.length;
        const searchEnd = Math.floor(n * cfg.searchRatio);
        const validationEnd = searchEnd + Math.floor(n * cfg.validationRatio);
        
        if (cfg.direction === 'hard-to-validation') {
            // Hard cases go to validation/holdout
            return {
                search: scoredCases.slice(0, searchEnd).map(s => s.case),
                validation: scoredCases.slice(searchEnd, validationEnd).map(s => s.case),
                holdout: scoredCases.slice(validationEnd).map(s => s.case),
            };
        } else {
            // Hard cases go to search (curriculum learning)
            return {
                search: scoredCases.slice(validationEnd).map(s => s.case),
                validation: scoredCases.slice(searchEnd, validationEnd).map(s => s.case),
                holdout: scoredCases.slice(0, searchEnd).map(s => s.case),
            };
        }
    }
    
    splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        const cfg = adversarialSplitConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        // For quality cases, use input length/complexity as difficulty
        const scoredCases = cases.map(c => ({
            case: c,
            difficulty: this.computeQualityDifficulty(c),
        }));
        
        scoredCases.sort((a, b) => b.difficulty - a.difficulty); // Hard to test
        
        const splitIdx = Math.floor(scoredCases.length * (cfg.searchRatio + cfg.validationRatio));
        
        return {
            train: scoredCases.slice(0, splitIdx).map(s => s.case),
            test: scoredCases.slice(splitIdx).map(s => s.case),
        };
    }
    
    private computeDifficulty(c: IntentCase, cfg: any): number {
        // Use historical data if available
        if (cfg.historicalData && cfg.historicalData[c.id]) {
            const hist = cfg.historicalData[c.id];
            let score = 0;
            
            for (const metric of cfg.difficultyMetrics) {
                const val = hist[metric] ?? 0;
                switch (metric) {
                    case 'completion':
                        score += (1 - val) * 10; // Low completion = hard
                        break;
                    case 'steps':
                        score += val * 0.1; // Many steps = hard
                        break;
                    case 'corrections':
                        score += val * 2; // Many corrections = hard
                        break;
                    case 'complexity':
                        score += val * 5; // Custom complexity
                        break;
                }
            }
            
            return score;
        }
        
        // Heuristic based on case properties
        let score = 0;
        
        // Complex intents are harder
        const complexIntents = ['match_local', 'layout_property'];
        if (complexIntents.includes(c.intent)) score += 5;
        
        // More required keys = harder
        score += (c.expected.requiredKeys?.length ?? 0) * 2;
        
        // Higher minProperties = harder
        score += (c.expected.minProperties ?? 0) * 0.5;
        
        // Model-authored cases might be harder (less curated)
        if (c.provenance.author === 'model') score += 3;
        
        // Tags indicating difficulty
        const hardTags = ['complex', 'edge-case', 'multi-step', 'ambiguous'];
        for (const tag of c.tags) {
            if (hardTags.includes(tag)) score += 4;
        }
        
        return score;
    }
    
    private computeQualityDifficulty(c: QualityCase): number {
        let score = 0;
        
        // Longer input = harder
        score += Math.min(c.input.length / 100, 10);
        
        // More expectations = harder
        score += c.expected.length * 1.5;
        
        // Forbidden expectations add difficulty
        score += (c.forbidden?.length ?? 0) * 2;
        
        // Lower agreement = more ambiguous = harder
        if (c.labels) {
            score += (1 - c.labels.agreement) * 10;
        }
        
        return score;
    }
}

export function createAdversarialSplitStrategy(): AdversarialSplitStrategy {
    return new AdversarialSplitStrategy();
}