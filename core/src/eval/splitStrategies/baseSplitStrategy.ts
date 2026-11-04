/**
 * Base Split Strategy Plugin
 * Shared base class for all split strategies to reduce boilerplate
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import type { SplitStrategyConfig } from './index.js';
import { Plugin } from '../../utils/BasePlugin.js';
import { ValidationHelpers } from '../../utils/Registry.js';
import { hashString } from '../../utils/common.js';

// --- Base Split Strategy Plugin ---

export abstract class BaseSplitStrategy extends Plugin<SplitStrategyConfig> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly configSchema?: z.ZodSchema<SplitStrategyConfig> = undefined;

    getDefaultConfig(): SplitStrategyConfig {
        return { seed: 42 };
    }

    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.positiveInt(config.seed, 'seed'),
        );
    }

    protected hashBasedSplit<T extends { id: string }>(
        cases: T[],
        seed: number,
        ratios: { search: number; validation: number; holdout: number }
    ): { search: T[]; validation: T[]; holdout: T[] } {
        const search: T[] = [];
        const validation: T[] = [];
        const holdout: T[] = [];
        
        for (const c of cases) {
            const hash = hashString(c.id + seed);
            const bucket = hash / 0x100000000; // Normalize to [0, 1)
            
            if (bucket < ratios.search) {
                search.push(c);
            } else if (bucket < ratios.search + ratios.validation) {
                validation.push(c);
            } else {
                holdout.push(c);
            }
        }
        
        return { search, validation, holdout };
    }

    protected qualitySplit<T extends { id: string }>(
        cases: T[],
        seed: number,
        testRatio: number = 0.2
    ): { train: T[]; test: T[] } {
        const train: T[] = [];
        const test: T[] = [];
        
        for (const c of cases) {
            const hash = hashString(c.id + seed);
            const bucket = hash / 0x100000000;
            
            if (bucket < testRatio) {
                test.push(c);
            } else {
                train.push(c);
            }
        }
        
        return { train, test };
    }

    abstract splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } | Promise<{ search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] }>;
    
    splitQualityCases?(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } | Promise<{ train: QualityCase[]; test: QualityCase[] }>;
}