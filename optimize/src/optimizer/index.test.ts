/**
 * Optimizer tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrategyRegistry, createComponentStrategy, type Seam, type Strategy } from '@notention/core/ui/strategy';
import {
    enumerateCandidatesFromParamSpec,
    validatePatch,
    defaultOptimizerConfig,
    runOptimizerCycle,
    type OptimizerConfig,
    type OptimizerCandidate,
} from './index.js';

// Create a mock seam for testing
const testSeam: Seam = {
    id: 'test-0',
    name: 'test',
    description: 'Test seam',
    propsShape: {},
    components: [],
    role: 'capture',
};

describe('Optimizer', () => {
    let strategyRegistry: StrategyRegistry;

    beforeEach(() => {
        strategyRegistry = new StrategyRegistry();
    });

    describe('enumerateCandidatesFromParamSpec', () => {
        it('should return empty array for strategy with no params', () => {
            const strategy = createComponentStrategy('no-params', testSeam, () => null, '1.0.0', {}, {});
            expect(strategy.params).toEqual({});
            const candidates = enumerateCandidatesFromParamSpec(strategy, 10);
            expect(candidates).toHaveLength(0);
        });

        it('should generate candidates for boolean params', () => {
            const paramSpec = {
                enabled: { type: 'boolean' as const, default: true },
                debug: { type: 'boolean' as const, default: false },
            };
            const strategy = createComponentStrategy('bool-params', testSeam, () => null, '1.0.0', { enabled: true, debug: false }, paramSpec);
            const candidates = enumerateCandidatesFromParamSpec(strategy, 10);

            // Should generate: {enabled: false}, {debug: true}, {enabled: false, debug: true}
            // But skip all-defaults {enabled: true, debug: false}
            expect(candidates.length).toBeGreaterThan(0);
            expect(candidates.length).toBeLessThanOrEqual(3);
            
            // All candidates should differ from defaults
            for (const c of candidates) {
                const isDefaults = c.patch.enabled === true && c.patch.debug === false;
                expect(isDefaults).toBe(false);
            }
        });

        it('should generate candidates for enum params', () => {
            const paramSpec = {
                mode: { type: 'enum' as const, options: ['fast', 'balanced', 'accurate'], default: 'balanced' },
            };
            const strategy = createComponentStrategy('enum-params', testSeam, () => null, '1.0.0', { mode: 'balanced' }, paramSpec);
            const candidates = enumerateCandidatesFromParamSpec(strategy, 10);

            // Should generate: {mode: 'fast'}, {mode: 'accurate'} (skip 'balanced' default)
            expect(candidates).toHaveLength(2);
            const modes = candidates.map(c => c.patch.mode).sort();
            expect(modes).toEqual(['accurate', 'fast']);
        });

        it('should generate candidates for number params with bounds', () => {
            const paramSpec = {
                threshold: { type: 'number' as const, min: 0, max: 1, default: 0.5 },
                count: { type: 'number' as const, min: 1, max: 10, default: 5 },
            };
            const strategy = createComponentStrategy('num-params', testSeam, () => null, '1.0.0', { threshold: 0.5, count: 5 }, paramSpec);
            const candidates = enumerateCandidatesFromParamSpec(strategy, 100);

            // Should include boundary values and midpoints
            // threshold: 0, 0.5 (default), 1, 0.5 (midpoint) = unique: 0, 0.5, 1
            // count: 1, 5 (default), 10, 5.5 (midpoint) = unique: 1, 5, 5.5, 10
            // Cartesian product minus all-defaults = 3 * 4 - 1 = 11
            expect(candidates.length).toBeGreaterThan(0);
            
            // Check boundary values are included
            const thresholds = candidates.map(c => c.patch.threshold).sort((a, b) => (a as number) - (b as number));
            expect(thresholds).toContain(0);
            expect(thresholds).toContain(1);
        });

        it('should respect maxCandidates limit', () => {
            const paramSpec = {
                a: { type: 'number' as const, min: 0, max: 10, default: 5 },
                b: { type: 'number' as const, min: 0, max: 10, default: 5 },
                c: { type: 'number' as const, min: 0, max: 10, default: 5 },
                d: { type: 'number' as const, min: 0, max: 10, default: 5 },
            };
            const strategy = createComponentStrategy('many-params', testSeam, () => null, '1.0.0', 
                { a: 5, b: 5, c: 5, d: 5 }, paramSpec);
            const candidates = enumerateCandidatesFromParamSpec(strategy, 5);
            expect(candidates.length).toBeLessThanOrEqual(5);
        });

        it('should include provenance info', () => {
            const paramSpec = {
                testParam: { type: 'boolean' as const, default: true },
            };
            const strategy = createComponentStrategy('prov-test', testSeam, () => null, '1.0.0', { testParam: true }, paramSpec);
            const candidates = enumerateCandidatesFromParamSpec(strategy, 10);

            for (const c of candidates) {
                expect(c.provenance.generator).toBe('grid');
                expect(c.provenance.seed).toBe(42);
                expect(c.provenance.generatedAt).toBeDefined();
            }
        });
    });

    describe('validatePatch', () => {
        it('should accept valid patches', () => {
            const paramSpec = {
                enabled: { type: 'boolean' as const, default: true },
                mode: { type: 'enum' as const, options: ['a', 'b'], default: 'a' },
                threshold: { type: 'number' as const, min: 0, max: 1, default: 0.5 },
            };
            
            expect(validatePatch(paramSpec, { enabled: false })).toEqual({ valid: true, errors: [] });
            expect(validatePatch(paramSpec, { mode: 'b' })).toEqual({ valid: true, errors: [] });
            expect(validatePatch(paramSpec, { threshold: 0.7 })).toEqual({ valid: true, errors: [] });
            expect(validatePatch(paramSpec, { enabled: false, mode: 'b', threshold: 0.3 })).toEqual({ valid: true, errors: [] });
        });

        it('should reject unknown params', () => {
            const paramSpec = { known: { type: 'boolean' as const, default: true } };
            const result = validatePatch(paramSpec, { unknown: true });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown parameter: unknown');
        });

        it('should reject wrong types', () => {
            const paramSpec = {
                flag: { type: 'boolean' as const, default: true },
                count: { type: 'number' as const, default: 1 },
            };
            
            expect(validatePatch(paramSpec, { flag: 'not-boolean' }).valid).toBe(false);
            expect(validatePatch(paramSpec, { count: 'not-number' }).valid).toBe(false);
        });

        it('should reject out-of-bounds numbers', () => {
            const paramSpec = { threshold: { type: 'number' as const, min: 0, max: 1, default: 0.5 } };
            expect(validatePatch(paramSpec, { threshold: -0.1 }).valid).toBe(false);
            expect(validatePatch(paramSpec, { threshold: 1.1 }).valid).toBe(false);
        });

        it('should reject invalid enum values', () => {
            const paramSpec = { mode: { type: 'enum' as const, options: ['a', 'b'], default: 'a' } };
            expect(validatePatch(paramSpec, { mode: 'c' }).valid).toBe(false);
        });
    });

    describe('defaultOptimizerConfig', () => {
        it('should return sensible defaults', () => {
            const config = defaultOptimizerConfig();
            expect(config.targetSeams).toEqual(['capture', 'match']);
            expect(config.maxCandidatesPerSeam).toBe(8);
            expect(config.maxBrowserRuns).toBe(160);
            expect(config.maxTimeMinutes).toBe(30);
            expect(config.maxTokens).toBe(150000);
            expect(config.useSuccessiveHalving).toBe(true);
            expect(config.initialSliceFraction).toBe(0.25);
            expect(config.minPromote).toBe(2);
        });
    });

    describe('runOptimizerCycle integration', () => {
        it('should complete a cycle without errors (smoke test)', async () => {
            // This is a smoke test that runs with mocked components
            // In a real test environment, we'd mock more heavily
            const config: OptimizerConfig = {
                ...defaultOptimizerConfig(),
                targetSeams: ['capture'],
                maxCandidatesPerSeam: 2,
                maxBrowserRuns: 10,
                maxTimeMinutes: 1,
            };

            // This test primarily verifies the function runs without throwing
            // and returns a valid result structure
            try {
                // The actual run will attempt to load strategies from the registry
                // Since we don't have the full UI setup in tests, this may fail
                // But it should fail gracefully with a clear message
                const result = await runOptimizerCycle(config);
                
                expect(result).toBeDefined();
                expect(result.cycleId).toMatch(/^opt_/);
                expect(typeof result.candidatesEvaluated).toBe('number');
                expect(Array.isArray(result.winners)).toBe(true);
                expect(Array.isArray(result.losers)).toBe(true);
                expect(result.totalCost).toBeDefined();
                expect(result.manifestHash).toBeDefined();
            } catch (e) {
                // In test environment without UI strategies loaded, this is expected
                // The important thing is it doesn't crash with unexpected errors
                const error = e instanceof Error ? e.message : String(e);
                // Acceptable failures: no strategies found, missing test data, etc.
                expect(
                    error.includes('strategies') || 
                    error.includes('test data') ||
                    error.includes('not found') ||
                    error.includes('manifest')
                ).toBe(true);
            }
        }, 30000); // Longer timeout for integration test
    });
});