/**
 * SplitStrategy Interface + Registry (E2)
 * Pluggable case splitting: fixed, temporal, stratified, adversarial, holdout-rotation
 */

import { z } from 'zod';
import type { IntentCase, QualityCase } from '../caseManifest.js';
import { FixedSplitStrategy } from './fixed.js';
import { TemporalSplitStrategy } from './temporal.js';
import { StratifiedSplitStrategy } from './stratified.js';
import { AdversarialSplitStrategy } from './adversarial.js';
import { HoldoutRotationSplitStrategy } from './holdoutRotation.js';
import { createPluginRegistry, Registry } from '../../utils/Registry.js';

// --- SplitStrategy Interface ---

export interface SplitStrategyConfig {
    // Common config
    seed?: number;
    // Strategy-specific
    [key: string]: unknown;
}

export interface SplitStrategy {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    
    /**
     * Get the name of this strategy
     */
    getName(): string;
    
    /**
     * Split intent cases into search/validation/holdout
     */
    splitIntentCases(
        cases: IntentCase[],
        config: SplitStrategyConfig
    ): { search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] } | Promise<{ search: IntentCase[]; validation: IntentCase[]; holdout: IntentCase[] }>;
    
    /**
     * Split quality cases (if applicable)
     */
    splitQualityCases?(
        cases: QualityCase[],
        config: SplitStrategyConfig
    ): { train: QualityCase[]; test: QualityCase[] } | Promise<{ train: QualityCase[]; test: QualityCase[] }>;
    
    /**
     * Get default configuration
     */
    getDefaultConfig(): SplitStrategyConfig;
    
    /**
     * Validate configuration
     */
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] };
}

// --- SplitStrategy Registrable mixin ---
type RegistrableSplitStrategy = SplitStrategy & { 
    getDefaultConfig(): SplitStrategyConfig; 
    validateConfig(config: SplitStrategyConfig): { valid: boolean; errors: string[] } 
};

// --- Strategy Registry ---

const { registry: splitStrategyRegistry, get: getSplitStrategyRegistry, reset: resetSplitStrategyRegistry } = 
    createPluginRegistry<RegistrableSplitStrategy>('SplitStrategy', [
        new FixedSplitStrategy(),
        new TemporalSplitStrategy(),
        new StratifiedSplitStrategy(),
        new AdversarialSplitStrategy(),
        new HoldoutRotationSplitStrategy(),
    ]) as { registry: Registry<RegistrableSplitStrategy>; get: () => Registry<RegistrableSplitStrategy>; reset: () => void };

// --- Re-export strategies ---
export { FixedSplitStrategy } from './fixed.js';
export { TemporalSplitStrategy } from './temporal.js';
export { StratifiedSplitStrategy } from './stratified.js';
export { AdversarialSplitStrategy } from './adversarial.js';
export { HoldoutRotationSplitStrategy } from './holdoutRotation.js';

// --- Export registry and singleton ---
export { splitStrategyRegistry, getSplitStrategyRegistry, resetSplitStrategyRegistry };