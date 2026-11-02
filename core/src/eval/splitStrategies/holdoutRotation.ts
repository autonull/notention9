/**
 * Holdout Rotation Split Strategy - Rotates holdout set over time
 * Prevents overfitting to fixed holdout by cycling cases through holdout
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategy, SplitStrategyConfig } from './index.js';

// --- Holdout Rotation config schema ---
export const holdoutRotationConfigSchema = z.object({
    seed: z.number().int().default(42),
    searchRatio: z.number().min(0).max(1).default(0.6),
    validationRatio: z.number().min(0).max(1).default(0.2),
    holdoutRatio: z.number().min(0).max(1).default(0.2),
    // Rotation period in days
    rotationPeriodDays: z.number().int().positive().default(7),
    // Epoch timestamp for rotation anchor (default: project start)
    rotationEpoch: z.number().int().positive().optional(),
    // Number of holdout folds to cycle through
    numFolds: z.number().int().positive().default(5),
});

export class HoldoutRotationSplitStrategy implements SplitStrategy {
    readonly name = 'holdout-rotation';
    readonly description = 'Rotating holdout: cycles cases through holdout over time to prevent overfitting';
    readonly configSchema = holdoutRotationConfigSchema;
    
    getName(): string {
        return this.name;
    }
    
    getDefaultConfig(): SplitStrategyConfig {
        return {
            seed: 42,
            searchRatio: 0.6,
            validationRatio: 0.2,
            holdoutRatio: 0.2,
            rotationPeriodDays: 7,
            numFolds: 5,
        };
    }
    
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        const result = holdoutRotationConfigSchema.safeParse(config);
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
        const cfg = holdoutRotationConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        // Determine current fold based on time
        const now = Date.now();
        const epoch = cfg.rotationEpoch ?? this.getProjectStartTime();
        const periodMs = cfg.rotationPeriodDays * 24 * 60 * 60 * 1000;
        const currentFold = Math.floor((now - epoch) / periodMs) % cfg.numFolds;
        
        // Assign each case to a fold deterministically
        const foldAssignments = new Map<string, number>();
        for (const c of cases) {
            const hash = this.hashString(c.id + seed);
            foldAssignments.set(c.id, hash % cfg.numFolds);
        }
        
        // Current fold is holdout, next fold is validation, rest are search
        const holdoutFold = currentFold;
        const validationFold = (currentFold + 1) % cfg.numFolds;
        
        const search: IntentCase[] = [];
        const validation: IntentCase[] = [];
        const holdout: IntentCase[] = [];
        
        for (const c of cases) {
            const fold = foldAssignments.get(c.id) ?? 0;
            if (fold === holdoutFold) {
                holdout.push(c);
            } else if (fold === validationFold) {
                validation.push(c);
            } else {
                search.push(c);
            }
        }
        
        // Ensure minimum sizes by borrowing from search if needed
        this.ensureMinimums(search, validation, holdout, cfg);
        
        return { search, validation, holdout };
    }
    
    splitQualityCases(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } {
        const cfg = holdoutRotationConfigSchema.parse(config);
        const seed = cfg.seed ?? 42;
        
        const now = Date.now();
        const epoch = cfg.rotationEpoch ?? this.getProjectStartTime();
        const periodMs = cfg.rotationPeriodDays * 24 * 60 * 60 * 1000;
        const currentFold = Math.floor((now - epoch) / periodMs) % cfg.numFolds;
        
        const foldAssignments = new Map<string, number>();
        for (const c of cases) {
            const hash = this.hashString(c.id + seed);
            foldAssignments.set(c.id, hash % cfg.numFolds);
        }
        
        const testFold = currentFold;
        
        const train: QualityCase[] = [];
        const test: QualityCase[] = [];
        
        for (const c of cases) {
            const fold = foldAssignments.get(c.id) ?? 0;
            if (fold === testFold) {
                test.push(c);
            } else {
                train.push(c);
            }
        }
        
        return { train, test };
    }
    
    private ensureMinimums(
        search: IntentCase[],
        validation: IntentCase[],
        holdout: IntentCase[],
        cfg: any
    ): void {
        const minSize = 1;
        
        // If validation is empty, take from search
        if (validation.length < minSize && search.length > minSize) {
            validation.push(search.pop()!);
        }
        
        // If holdout is empty, take from search
        if (holdout.length < minSize && search.length > minSize) {
            holdout.push(search.pop()!);
        }
    }
    
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    private getProjectStartTime(): number {
        // Default to a fixed epoch (Jan 1, 2024)
        return new Date('2024-01-01').getTime();
    }
}

export function createHoldoutRotationSplitStrategy(): HoldoutRotationSplitStrategy {
    return new HoldoutRotationSplitStrategy();
}