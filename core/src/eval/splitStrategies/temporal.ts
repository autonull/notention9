/**
 * Temporal Split Strategy - Split by time/case creation order
 * Older cases -> search, newer -> validation, newest -> holdout
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategy, SplitStrategyConfig } from './index.js';

// --- Temporal Split config schema ---
export const temporalSplitConfigSchema = z.object({
    seed: z.number().int().optional(),
    searchRatio: z.number().min(0).max(1).default(0.6),
    validationRatio: z.number().min(0).max(1).default(0.2),
    holdoutRatio: z.number().min(0).max(1).default(0.2),
    // Sort by: 'createdAt' | 'updatedAt' | 'id' (fallback)
    sortField: z.enum(['createdAt', 'updatedAt', 'id']).default('createdAt'),
});

export class TemporalSplitStrategy implements SplitStrategy {
    readonly name = 'temporal';
    readonly description = 'Split cases chronologically: older -> search, newer -> validation, newest -> holdout';
    readonly configSchema = temporalSplitConfigSchema;
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): SplitStrategyConfig {
        return {
            seed: 42,
            searchRatio: 0.6,
            validationRatio: 0.2,
            holdoutRatio: 0.2,
            sortField: 'createdAt',
        };
    }
    
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        const result = temporalSplitConfigSchema.safeParse(config);
        if (!result.success) {
            return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
        }
        const cfg = result.data;
        const sum = cfg.searchRatio + cfg.validationRatio + cfg.holdoutRatio;
        if (Math.abs(sum - 1.0) > 0.001) {
            return { valid: false, errors: ['Ratios must sum to 1.0'] };
        }
        return { valid: true, errors: [] };
    }
    
    splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } {
        const cfg = temporalSplitConfigSchema.parse(config);
        
        // Sort by the specified field
        const sorted = [...cases].sort((a, b) => {
            const aVal = this.getSortValue(a, cfg.sortField);
            const bVal = this.getSortValue(b, cfg.sortField);
            return aVal.localeCompare(bVal);
        });
        
        const n = sorted.length;
        const searchEnd = Math.floor(n * cfg.searchRatio);
        const validationEnd = searchEnd + Math.floor(n * cfg.validationRatio);
        
        return {
            search: sorted.slice(0, searchEnd),
            validation: sorted.slice(searchEnd, validationEnd),
            holdout: sorted.slice(validationEnd),
        };
    }
    
    splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        const cfg = temporalSplitConfigSchema.parse(config);
        
        const sorted = [...cases].sort((a, b) => {
            const aVal = this.getSortValue(a, cfg.sortField);
            const bVal = this.getSortValue(b, cfg.sortField);
            return aVal.localeCompare(bVal);
        });
        
        const splitIdx = Math.floor(sorted.length * (cfg.searchRatio + cfg.validationRatio));
        
        return {
            train: sorted.slice(0, splitIdx),
            test: sorted.slice(splitIdx),
        };
    }
    
    private getSortValue(obj: any, field: string): string {
        switch (field) {
            case 'createdAt':
                return obj.provenance?.source?.includes('timestamp') ? obj.provenance.source : obj.id;
            case 'updatedAt':
                return obj.tags?.find((t: string) => t.startsWith('updated:'))?.split(':')[1] ?? obj.id;
            case 'id':
            default:
                return obj.id;
        }
    }
}

export function createTemporalSplitStrategy(): TemporalSplitStrategy {
    return new TemporalSplitStrategy();
}