/**
 * SplitStrategy Interface + Registry (E2)
 * Pluggable case splitting: fixed, temporal, stratified, adversarial, holdout-rotation
 */

import { z } from 'zod';
import type { IntentCase, QualityCase, CaseSplit } from '../caseManifest.js';
import { FixedSplitStrategy } from './fixed.js';
import { TemporalSplitStrategy } from './temporal.js';
import { StratifiedSplitStrategy } from './stratified.js';
import { AdversarialSplitStrategy } from './adversarial.js';
import { HoldoutRotationSplitStrategy } from './holdoutRotation.js';

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

// --- Strategy Registry ---

export class SplitStrategyRegistry {
    private strategies = new Map<string, SplitStrategy>();
    
    constructor() {
        // Register built-in strategies
        this.register(new FixedSplitStrategy());
        this.register(new TemporalSplitStrategy());
        this.register(new StratifiedSplitStrategy());
        this.register(new AdversarialSplitStrategy());
        this.register(new HoldoutRotationSplitStrategy());
    }
    
    register(strategy: SplitStrategy): void {
        if (this.strategies.has(strategy.name)) {
            throw new Error(`SplitStrategy '${strategy.name}' already registered`);
        }
        this.strategies.set(strategy.name, strategy);
    }
    
    unregister(name: string): boolean {
        return this.strategies.delete(name);
    }
    
    get(name: string): SplitStrategy | undefined {
        return this.strategies.get(name);
    }
    
    getAll(): SplitStrategy[] {
        return Array.from(this.strategies.values());
    }
    
    listNames(): string[] {
        return Array.from(this.strategies.keys());
    }
    
    has(name: string): boolean {
        return this.strategies.has(name);
    }
}

// --- Re-export strategies ---
export { FixedSplitStrategy, type SplitStrategyConfig as FixedSplitConfig } from './fixed.js';
export { TemporalSplitStrategy, type SplitStrategyConfig as TemporalSplitConfig } from './temporal.js';
export { StratifiedSplitStrategy, type SplitStrategyConfig as StratifiedSplitConfig } from './stratified.js';
export { AdversarialSplitStrategy, type SplitStrategyConfig as AdversarialSplitConfig } from './adversarial.js';
export { HoldoutRotationSplitStrategy, type SplitStrategyConfig as HoldoutRotationSplitConfig } from './holdoutRotation.js';

// --- Singleton ---
let splitStrategyRegistryInstance: SplitStrategyRegistry | null = null;

export function getSplitStrategyRegistry(): SplitStrategyRegistry {
    if (!splitStrategyRegistryInstance) {
        splitStrategyRegistryInstance = new SplitStrategyRegistry();
    }
    return splitStrategyRegistryInstance;
}

export function resetSplitStrategyRegistry(): void {
    splitStrategyRegistryInstance = null;
}