/**
 * Fixed Split Strategy - Static case assignments (backward compatible)
 * Uses pre-defined splits from case files
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategyConfig } from './index.js';
import { BaseSplitStrategy } from './baseSplitStrategy.js';

// --- Fixed Split config schema ---
export const fixedSplitConfigSchema = z.object({
    seed: z.number().int().optional(),
    // Fixed strategy uses pre-assigned splits from case files
    // No additional config needed
});

export class FixedSplitStrategy extends BaseSplitStrategy {
    readonly name = 'fixed';
    readonly description = 'Use pre-assigned splits from case metadata (backward compatible)';
    readonly configSchema = fixedSplitConfigSchema;
    
    getDefaultConfig(): SplitStrategyConfig {
        return { seed: 42 };
    }
    
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        const result = fixedSplitConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        return { valid: true, errors: [] };
    }
    
    splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } {
        // Cases already have split assigned in their metadata
        // This strategy just respects the existing assignment
        
        const search = cases.filter(c => (c as any).split === 'search' || c.tags.includes('split:search'));
        const validation = cases.filter(c => (c as any).split === 'validation' || c.tags.includes('split:validation'));
        const holdout = cases.filter(c => (c as any).split === 'holdout' || c.tags.includes('split:holdout'));
        
        // If no explicit split tags, use deterministic hash-based assignment
        if (search.length === 0 && validation.length === 0 && holdout.length === 0) {
            return this.hashBasedSplit(cases, config.seed ?? 42, { search: 0.6, validation: 0.2, holdout: 0.2 });
        }
        
        return { search, validation, holdout };
    }
    
    splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        // Quality cases don't typically have splits - use 80/20 hash-based
        return this.qualitySplit(cases, config.seed ?? 42, 0.2);
    }
}

export function createFixedSplitStrategy(): FixedSplitStrategy {
    return new FixedSplitStrategy();
}