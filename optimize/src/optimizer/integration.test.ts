/**
 * Optimizer integration test — Full cycle with registered strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// TODO: Fix port allocation flake - see TODO.14.md A1.2
// These tests require a preview server which has port allocation issues in CI
// Marking as skip until a dynamic port allocator is implemented
import { strategyRegistry, resetStrategyRegistry, createComponentStrategy, type Seam } from '@notention/core/ui/strategy';
import { runOptimizerCycle, defaultOptimizerConfig, getCandidateCache, resetCandidateCache } from './index.js';

// Create mock seams for testing
const testSeam: Seam = {
    id: 'capture-0',
    name: 'Capture',
    description: 'Natural language capture interface',
    role: 'capture',
    components: [],
    propsShape: {},
};

const matchSeam: Seam = {
    id: 'match-0',
    name: 'Match Display',
    description: 'Match explanation and selection interface',
    role: 'match',
    components: [],
    propsShape: {},
};

describe.skip('Optimizer Integration', () => {
    beforeEach(() => {
        // Clear the global registry
        resetStrategyRegistry();
        resetCandidateCache();

        // Register test seams with strategies using the global registry
        
        // Register capture seam strategies
        strategyRegistry.register(createComponentStrategy(
            'describe-it-composer',
            testSeam,
            () => null,
            '1.0.0',
            { autoFocus: false, placeholder: 'Enter text', isAdding: true },
            {
                autoFocus: { type: 'boolean' as const, default: false, description: 'Auto-focus input' },
                placeholder: { type: 'string' as const, default: 'Enter text', description: 'Placeholder text' },
                isAdding: { type: 'boolean' as const, default: true, description: 'Add mode' },
            }
        ));

        strategyRegistry.register(createComponentStrategy(
            'property-form',
            testSeam,
            () => null,
            '1.0.0',
            { isAdding: true, initialOp: 'is' },
            { isAdding: { type: 'boolean' as const, default: true }, initialOp: { type: 'enum' as const, options: ['is', 'equals', 'contains'], default: 'is' } }
        ));

        // Register match seam strategies
        strategyRegistry.register(createComponentStrategy(
            'local-match-preview',
            matchSeam,
            () => null,
            '1.0.0',
            { showScore: true, showDetails: false, compactMode: false },
            { showScore: { type: 'boolean' as const, default: true }, showDetails: { type: 'boolean' as const, default: false }, compactMode: { type: 'boolean' as const, default: false } }
        ));

        strategyRegistry.register(createComponentStrategy(
            'dashboard-local-match',
            matchSeam,
            () => null,
            '1.0.0',
            { minScore: 0.4, maxResults: 5 },
            {
                minScore: { type: 'number' as const, min: 0, max: 1, default: 0.4 },
                maxResults: { type: 'number' as const, min: 1, max: 20, default: 5 },
                showScore: { type: 'boolean' as const, default: true },
            }
        ));
    });

    it('should complete a full optimizer cycle with registered strategies', async () => {
        const config = {
            ...defaultOptimizerConfig(),
            targetSeams: ['capture', 'match'],
            maxCandidatesPerSeam: 2,
            maxBrowserRuns: 8,
            maxTimeMinutes: 1,
            useSuccessiveHalving: true,
            initialSliceFraction: 0.5,
            minPromote: 1,
            maxIntentCases: 1,
        };

        const result = await runOptimizerCycle(config);

        expect(result).toBeDefined();
        expect(result.cycleId).toMatch(/^opt_/);
        expect(typeof result.candidatesEvaluated).toBe('number');
        expect(result.candidatesEvaluated).toBeGreaterThan(0);
        expect(Array.isArray(result.winners)).toBe(true);
        expect(Array.isArray(result.losers)).toBe(true);
        expect(result.totalCost).toBeDefined();
        expect(result.manifestHash).toBeDefined();

        console.log(`Cycle ${result.cycleId} completed:`);
        console.log(`  Candidates: ${result.candidatesEvaluated}`);
        console.log(`  Winners: ${result.winners.length}`);
        console.log(`  Losers: ${result.losers.length}`);
        console.log(`  Duration: ${result.totalCost.durationMs}ms`);
    });

    it('should cache candidate evaluations across cycles', async () => {
        const config = {
            ...defaultOptimizerConfig(),
            targetSeams: ['capture'],
            maxCandidatesPerSeam: 2,
            maxBrowserRuns: 4,
            maxTimeMinutes: 1,
            useSuccessiveHalving: true,
            initialSliceFraction: 0.5,
            minPromote: 1,
            maxIntentCases: 1,
        };

        // First cycle
        const result1 = await runOptimizerCycle(config);
        const cacheAfterFirst = getCandidateCache().size;

        expect(cacheAfterFirst).toBeGreaterThan(0);

        // Second cycle with same config - should hit cache
        const result2 = await runOptimizerCycle(config);
        const cacheAfterSecond = getCandidateCache().size;

        // Cache size should not increase (same candidates, cache hits)
        expect(cacheAfterSecond).toBe(cacheAfterFirst);

        // Results should be identical
        expect(result2.candidatesEvaluated).toBe(result1.candidatesEvaluated);
    });

    it('should handle cache persistence across instances', async () => {
        const config = {
            ...defaultOptimizerConfig(),
            targetSeams: ['capture'],
            maxCandidatesPerSeam: 2,
            maxBrowserRuns: 4,
            maxTimeMinutes: 1,
            useSuccessiveHalving: true,
            initialSliceFraction: 0.5,
            minPromote: 1,
            maxIntentCases: 1,
        };

        // First cycle to populate cache
        await runOptimizerCycle(config);
        const firstCacheSize = getCandidateCache().size;
        expect(firstCacheSize).toBeGreaterThan(0);

        // Reset cache instance (simulates new process)
        resetCandidateCache();

        // New cache instance should load from disk
        const newCacheSize = getCandidateCache().size;
        expect(newCacheSize).toBe(firstCacheSize);
    });

    it('should only evaluate candidates with valid ParamSpec params', async () => {
        // Register a strategy without ParamSpec using global registry
        strategyRegistry.register(createComponentStrategy(
            'no-params-strategy',
            testSeam,
            () => null,
            '1.0.0',
            {},
            {} // No params
        ));

        const config = {
            ...defaultOptimizerConfig(),
            targetSeams: ['capture'],
            maxCandidatesPerSeam: 4,
            maxBrowserRuns: 4,
            maxTimeMinutes: 1,
            useSuccessiveHalving: true,
            initialSliceFraction: 0.5,
            minPromote: 1,
            maxIntentCases: 1,
        };

        const result = await runOptimizerCycle(config);

        // Should still complete successfully
        expect(result.candidatesEvaluated).toBeGreaterThan(0);
    });
});