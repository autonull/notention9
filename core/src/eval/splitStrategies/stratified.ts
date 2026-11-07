/**
 * Stratified Split Strategy - Balanced splits by tags/intent type
 * Ensures each split has representative distribution of case characteristics
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategyConfig } from './index.js';
import { BaseSplitStrategy } from './baseSplitStrategy.js';
import { validateRatiosSumToOne, shuffleArray } from '../../utils/common.js';

// --- Stratified Split config schema ---
export const stratifiedSplitConfigSchema = z.object({
    seed: z.number().int().default(42),
    searchRatio: z.number().min(0).max(1).default(0.6),
    validationRatio: z.number().min(0).max(1).default(0.2),
    holdoutRatio: z.number().min(0).max(1).default(0.2),
    // Stratify by: 'intent' | 'tags' | 'provenance' | 'custom'
    stratifyBy: z.enum(['intent', 'tags', 'provenance', 'custom']).default('intent'),
    // For 'custom', provide a function name or key
    customStrataKey: z.string().optional(),
    minPerStratum: z.number().int().positive().default(1),
});

export class StratifiedSplitStrategy extends BaseSplitStrategy {
    override readonly name = 'stratified';
    override readonly description = 'Stratified sampling: balanced representation of intents/tags across splits';
    override readonly configSchema = stratifiedSplitConfigSchema;
    
    override getName(): string {
        return this.name;
    }

    override getDefaultConfig(): SplitStrategyConfig {
        return {
            seed: 42,
            searchRatio: 0.6,
            validationRatio: 0.2,
            holdoutRatio: 0.2,
            stratifyBy: 'intent',
            minPerStratum: 1,
        };
    }
    
    override validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        const result = stratifiedSplitConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        const cfg = result.data;
        return validateRatiosSumToOne(cfg.searchRatio, cfg.validationRatio, cfg.holdoutRatio);
    }
    
    override splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } {
        const cfg = stratifiedSplitConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        // Group cases by stratum
        const strata = new Map<string, IntentCase[]>();
        
        for (const c of cases) {
            const stratumKey = this.getStratumKey(c, cfg);
            const arr = strata.get(stratumKey) ?? [];
            arr.push(c);
            strata.set(stratumKey, arr);
        }
        
        // Split each stratum proportionally
        const search: IntentCase[] = [];
        const validation: IntentCase[] = [];
        const holdout: IntentCase[] = [];
        
        for (const [key, stratumCases] of strata) {
            // Shuffle within stratum
            const shuffled = shuffleArray([...stratumCases], seed + key.length);
            
            const n = shuffled.length;
            const searchEnd = Math.max(cfg.minPerStratum, Math.floor(n * cfg.searchRatio));
            const validationEnd = searchEnd + Math.max(cfg.minPerStratum, Math.floor(n * cfg.validationRatio));
            
            search.push(...shuffled.slice(0, searchEnd));
            validation.push(...shuffled.slice(searchEnd, validationEnd));
            holdout.push(...shuffled.slice(validationEnd));
        }
        
        return { search, validation, holdout };
    }
    
    override splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        const cfg = stratifiedSplitConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        // Group by qualityFamily as stratum
        const strata = new Map<string, QualityCase[]>();
        
        for (const c of cases) {
            const key = c.qualityFamily;
            const arr = strata.get(key) ?? [];
            arr.push(c);
            strata.set(key, arr);
        }
        
        const train: QualityCase[] = [];
        const test: QualityCase[] = [];
        
        for (const [key, stratumCases] of strata) {
            const shuffled = shuffleArray([...stratumCases], seed + key.length);
            const splitIdx = Math.max(cfg.minPerStratum, Math.floor(shuffled.length * (cfg.searchRatio + cfg.validationRatio)));
            
            train.push(...shuffled.slice(0, splitIdx));
            test.push(...shuffled.slice(splitIdx));
        }
        
        return { train, test };
    }
    
    private getStratumKey(c: IntentCase, cfg: any): string {
        switch (cfg.stratifyBy) {
            case 'intent':
                return c.intent;
            case 'tags':
                // Use first tag or 'untagged'
                return c.tags[0] ?? 'untagged';
            case 'provenance':
                return c.provenance.author + ':' + c.provenance.source;
            case 'custom':
                if (cfg.customStrataKey && (c as any)[cfg.customStrataKey]) {
                    return String((c as any)[cfg.customStrataKey]);
                }
                return c.intent;
            default:
                return c.intent;
        }
    }
}

export function createStratifiedSplitStrategy(): StratifiedSplitStrategy {
    return new StratifiedSplitStrategy();
}