/**
 * Fixed Split Strategy - Static case assignments (backward compatible)
 * Uses pre-defined splits from case files
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategy, SplitStrategyConfig } from './index.js';
import { hashString } from '../../utils/common.js';

// --- Fixed Split config schema ---
export const fixedSplitConfigSchema = z.object({
    seed: z.number().int().optional(),
    // Fixed strategy uses pre-assigned splits from case files
    // No additional config needed
});

export class FixedSplitStrategy implements SplitStrategy {
    readonly name = 'fixed';
    readonly description = 'Use pre-assigned splits from case metadata (backward compatible)';
    readonly configSchema = fixedSplitConfigSchema;
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): SplitStrategyConfig {
        return {
            seed: 42,
        };
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
            return this.hashBasedSplit(cases, config.seed ?? 42);
        }
        
        return { search, validation, holdout };
    }
    
    splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        // Quality cases don't typically have splits - use 80/20 hash-based
        const seed = config.seed ?? 42;
        const train: QualityCase[] = [];
        const test: QualityCase[] = [];
        
        for (const c of cases) {
            const hash = hashString(c.id + seed);
            if (hash % 5 === 0) { // 20% test
                test.push(c);
            } else {
                train.push(c);
            }
        }
        
        return { train, test };
    }
    
    private hashBasedSplit(
        cases: IntentCase[],
        seed: number
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } {
        const search: IntentCase[] = [];
        const validation: IntentCase[] = [];
        const holdout: IntentCase[] = [];
        
        for (const c of cases) {
            const hash = hashString(c.id + seed);
            const bucket = hash % 10;
            
            if (bucket < 6) { // 60% search
                search.push(c);
            } else if (bucket < 8) { // 20% validation
                validation.push(c);
            } else { // 20% holdout
                holdout.push(c);
            }
        }
        
        return { search, validation, holdout };
    }
}

export function createFixedSplitStrategy(): FixedSplitStrategy {
    return new FixedSplitStrategy();
}