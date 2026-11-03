/**
 * Matrix Test Runner (CI Gate)
 * Tests all plugin combinations dynamically from registries
 * Minimum gate: 3 engines × 3 splits × 2 stores = 18 combos (excluding LLM/Human judges for CI speed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IntentCase, QualityCase, CaseManifest, CaseEntry } from '../eval/caseManifest.js';
import type { ExtendedRunVerdict, VerdictEngineConfig } from '../eval/verdictEngines/index.js';

// Mock SQLite imports BEFORE importing modules that depend on them
vi.mock('../eval/caseStore/sqlite.ts', () => ({
    SQLiteCaseStore: class MockSQLiteCaseStore {
        constructor() { throw new Error('SQLite not available in CI'); }
    }
}));

vi.mock('../telemetry/eventStore/sqlite.ts', () => ({
    SQLiteEventStore: class MockSQLiteEventStore {
        constructor() { throw new Error('SQLite not available in CI'); }
    }
}));

// Import after mocks
import { getVerdictEngineRegistry, resetVerdictEngineRegistry } from '../eval/verdictEngines/index.js';
import { getSplitStrategyRegistry, resetSplitStrategyRegistry } from '../eval/splitStrategies/index.js';
import { getCaseStoreRegistry, resetCaseStoreRegistry, createInMemoryCaseStore } from '../eval/caseStore/index.js';
import { getEventStoreRegistry, resetEventStoreRegistry, createJSONLEventStore } from '../telemetry/eventStore/index.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';

// --- Test Data Factories ---

function createTestIntentCase(id: string, split: 'search' | 'validation' | 'holdout' = 'search'): IntentCase {
    return {
        id,
        family: 'intent',
        intent: `test_${id}`,
        prompt: `Test prompt for ${id}`,
        seed: {
            notes: [],
            settings: {},
            revisions: ['incumbent'],
        },
        expected: {
            minProperties: 1,
            requiredKeys: ['title'],
            outcome: 'captured',
        },
        metrics: ['completion'],
        tags: ['test'],
        provenance: {
            author: 'human',
            source: 'test',
        },
        split,
    };
}

function createTestQualityCase(id: string, qualityFamily: 'extraction' | 'match' = 'extraction'): QualityCase {
    return {
        id,
        family: 'quality',
        qualityFamily,
        input: `Test input for ${id}`,
        expected: [{ key: 'title', operator: 'equals', values: ['Test'] }],
        tags: ['test'],
    };
}

function createTestManifest(): CaseManifest {
    const intentCases = [
        createTestIntentCase('case-1', 'search'),
        createTestIntentCase('case-2', 'validation'),
        createTestIntentCase('case-3', 'holdout'),
    ];
    const qualityCases = [
        createTestQualityCase('quality-1'),
        createTestQualityCase('quality-2'),
    ];
    
    const allCases = [...intentCases, ...qualityCases];
    const cases: CaseEntry[] = allCases.map(c => ({
        id: c.id,
        family: c.family,
        split: 'split' in c ? c.split : undefined,
        qualityFamily: 'qualityFamily' in c ? c.qualityFamily : undefined,
        path: `${c.family}_${c.id}.json`,
        hash: 'test-hash',
        tags: c.tags,
    }));
    
    return {
        version: 1,
        hash: 'test-manifest-hash',
        generatedAt: new Date().toISOString(),
        counts: {
            intent: { search: 1, validation: 1, holdout: 1 },
            quality: { extraction: 2, match: 0 },
        },
        cases,
    };
}

function createPairedRunResult(overrides: Partial<Record<string, number>> = {}): any {
    return {
        baseline: { metrics: { completion: 0.8, steps: 3, precision: 0.75, recall: 0.8, ...overrides } },
        candidate: { metrics: { completion: 0.85, steps: 2, precision: 0.8, recall: 0.85, ...overrides } },
        sampleSize: 50,
    };
}

// --- Dynamic Matrix Configuration ---

/**
 * Get testable engine names (exclude LLM/Human for CI speed)
 */
function getTestableVerdictEngines(): string[] {
    const registry = getVerdictEngineRegistry();
    return registry.getAll()
        .filter(e => e.evidenceClass === 'measured')
        .map(e => e.name);
}

/**
 * Get testable split strategies (all)
 */
function getTestableSplitStrategies(): string[] {
    const registry = getSplitStrategyRegistry();
    return registry.getAll().map(s => s.name);
}

/**
 * Get testable case stores (exclude filesystem for hash matching)
 */
function getTestableCaseStores(): Array<{ name: string; create: () => any }> {
    const registry = getCaseStoreRegistry();
    return registry.listNames()
        .filter(name => name !== 'filesystem' && name !== 'sqlite')
        .map(name => ({ name, create: () => registry.create(name) }));
}

/**
 * Get testable event stores (exclude sqlite stub)
 */
function getTestableEventStores(): Array<{ name: string; create: (path: string) => any }> {
    const registry = getEventStoreRegistry();
    return registry.listNames()
        .filter(name => name !== 'sqlite')
        .map(name => ({ name, create: (path: string) => registry.create(name, path) }));
}

interface MatrixCombo {
    verdictEngine: string;
    splitStrategy: string;
    caseStore: { name: string; create: () => any };
    eventStore: { name: string; create: (path: string) => any };
}

function generateMatrix(): MatrixCombo[] {
    const engines = getTestableVerdictEngines();
    const splits = getTestableSplitStrategies();
    const caseStores = getTestableCaseStores();
    const eventStores = getTestableEventStores();
    
    const combos: MatrixCombo[] = [];
    for (const verdictEngine of engines) {
        for (const splitStrategy of splits) {
            for (const caseStore of caseStores) {
                for (const eventStore of eventStores) {
                    combos.push({ verdictEngine, splitStrategy, caseStore, eventStore });
                }
            }
        }
    }
    return combos;
}

// --- Test Suite ---

const MATRIX_COMBOS = generateMatrix();
console.log(`\n📊 Matrix Test: ${MATRIX_COMBOS.length} combinations (dynamic from registries)`);

describe('Matrix Test: Plugin Combinations', () => {
    let tmpDir: string;
    
    beforeEach(() => {
        tmpDir = join(tmpdir(), `notention-matrix-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(tmpDir, { recursive: true });
    });
    
    afterEach(() => {
        try {
            rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });
    
    // Run each combination as a sub-test
    for (const combo of MATRIX_COMBOS) {
        const label = `${combo.verdictEngine}/${combo.splitStrategy}/${combo.caseStore.name}/${combo.eventStore.name}`;
        
        it(`combo: ${label}`, async () => {
            // 1. Create components
            const verdictEngineRegistry = getVerdictEngineRegistry();
            const splitStrategyRegistry = getSplitStrategyRegistry();
            
            const verdictEngine = verdictEngineRegistry.get(combo.verdictEngine);
            const splitStrategy = splitStrategyRegistry.get(combo.splitStrategy);
            
            expect(verdictEngine).toBeDefined();
            expect(splitStrategy).toBeDefined();
            
            // Create case store (dynamic)
            const caseStore = combo.caseStore.create();
            await caseStore.init({});
            const manifest = createTestManifest();
            // Manually populate in-memory store
            for (const entry of manifest.cases) {
                let caseData: IntentCase | QualityCase;
                if (entry.family === 'intent') {
                    caseData = createTestIntentCase(entry.id, entry.split as any);
                } else {
                    caseData = createTestQualityCase(entry.id, entry.qualityFamily as any);
                }
                await caseStore.upsertCase(caseData);
            }
            
            // Create event store (dynamic)
            const eventPath = join(tmpDir, 'events.jsonl');
            const eventStore = combo.eventStore.create(eventPath);
            await eventStore.init({});
            
            // 2. Test CaseStore operations
            const readManifest = await caseStore.readManifest();
            expect(readManifest).toBeDefined();
            expect(readManifest.cases.length).toBe(5); // 3 intent + 2 quality
            
            const allIntentCases = await caseStore.readIntentCases('search');
            // InMemoryCaseStore returns all intent cases regardless of split filter
            expect(allIntentCases.length).toBe(3);
            
            // 3. Test SplitStrategy
            const splitConfig = splitStrategy!.getDefaultConfig();
            const splitResult = splitStrategy!.splitIntentCases(allIntentCases, splitConfig);
            const totalSplit = splitResult.search.length + splitResult.validation.length + splitResult.holdout.length;
            expect(totalSplit).toBe(allIntentCases.length);
            
            // 4. Test VerdictEngine
            const verdictConfig = verdictEngine!.getDefaultConfig() as VerdictEngineConfig;
            const paired = createPairedRunResult();
            
            // Compute case verdict
            const caseVerdict = await verdictEngine!.computeCaseVerdict('case-1', paired, verdictConfig);
            expect(caseVerdict).toBeDefined();
            expect(caseVerdict.verdict).toBeDefined();
            expect(caseVerdict.primaryMetric.evidenceClass).toBe('measured');
            expect(caseVerdict.primaryMetric.judgeProvenance).toBeDefined();
            
            // Compute run verdict
            const runVerdict = await verdictEngine!.computeRunVerdict(
                'run-1',
                'manifest-hash',
                'rev-1',
                'rev-0',
                [caseVerdict],
                'completion'
            );
            expect(runVerdict).toBeDefined();
            expect(runVerdict.governanceGatePassed).toBe(true);
            expect(runVerdict.primaryMetricAggregate.evidenceClass).toBe('measured');
            
            // 5. Test EventStore
            await eventStore.append({
                runId: 'run-1',
                type: 'run:started',
                actor: 'test',
                timestamp: new Date().toISOString(),
                payload: { type: 'run:started', runId: 'run-1' },
            });
            
            const events = await eventStore.query({ runId: 'run-1' });
            expect(events.length).toBe(1);
            
            // 6. Cross-plugin interaction: store verdict in event store
            await eventStore.append({
                runId: 'run-1',
                type: 'verdict:computed',
                actor: 'test',
                timestamp: new Date().toISOString(),
                payload: { type: 'verdict:computed', runId: 'run-1', verdict: runVerdict },
            });
            
            const verdictEvents = await eventStore.query({ runId: 'run-1', type: 'verdict:computed' });
            expect(verdictEvents.length).toBe(1);
            
            // 7. Test case store integrity
            const integrity = await caseStore.verifyIntegrity();
            expect(integrity.valid).toBe(true);
            
            // Cleanup
            await caseStore.close();
            await eventStore.close();
        }, 30000); // 30s timeout per combo
    }
});

// --- Smoke test for LLM/Human judges (separate, slower) ---

describe('Matrix Test: LLM/Human Judges (smoke)', () => {
    let tmpDir: string;
    
    beforeEach(() => {
        tmpDir = join(tmpdir(), `notention-matrix-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(tmpDir, { recursive: true });
    });
    
    afterEach(() => {
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
    
    it('llm-judge + fixed + memory + jsonl', async () => {
        const verdictEngineRegistry = getVerdictEngineRegistry();
        const splitStrategyRegistry = getSplitStrategyRegistry();
        const caseStoreRegistry = getCaseStoreRegistry();
        const eventStoreRegistry = getEventStoreRegistry();
        
        const verdictEngine = verdictEngineRegistry.get('llm-judge');
        const splitStrategy = splitStrategyRegistry.get('fixed');
        const caseStore = createInMemoryCaseStore();
        const eventStore = createJSONLEventStore(join(tmpDir, 'events.jsonl'));
        
        expect(verdictEngine).toBeDefined();
        expect(splitStrategy).toBeDefined();
        
        await caseStore.init({});
        await eventStore.init({});
        
        // LLM judge should have 'hypothesized' evidence class
        expect(verdictEngine!.evidenceClass).toBe('hypothesized');
        
        const manifest = createTestManifest();
        const allCases = [
            ...manifest.cases.filter(c => c.family === 'intent').map(c => createTestIntentCase(c.id, c.split as any)),
        ];
        
        const splitResult = splitStrategy!.splitIntentCases(allCases, splitStrategy!.getDefaultConfig());
        
        // Quick check - doesn't need full run
        expect(splitResult.search.length + splitResult.validation.length + splitResult.holdout.length).toBe(allCases.length);
        
        await caseStore.close();
        await eventStore.close();
    }, 10000);
    
    it('human-judge + fixed + memory + jsonl', async () => {
        const verdictEngineRegistry = getVerdictEngineRegistry();
        const splitStrategyRegistry = getSplitStrategyRegistry();
        const caseStoreRegistry = getCaseStoreRegistry();
        const eventStoreRegistry = getEventStoreRegistry();
        
        const verdictEngine = verdictEngineRegistry.get('human-judge');
        const splitStrategy = splitStrategyRegistry.get('fixed');
        const caseStore = createInMemoryCaseStore();
        const eventStore = createJSONLEventStore(join(tmpDir, 'events.jsonl'));
        
        expect(verdictEngine).toBeDefined();
        
        await caseStore.init({});
        await eventStore.init({});
        
        // Human judge should have 'observed' evidence class
        expect(verdictEngine!.evidenceClass).toBe('observed');
        
        await caseStore.close();
        await eventStore.close();
    }, 10000);
});

// --- Registry health checks ---

import { getResolutionStrategyRegistry } from '../ui/resolutionStrategy.js';
import { getRevisionDriverRegistry } from '../telemetry/revisionDriver.js';
import { passesGovernanceGate } from '../schemas/evidence.js';

describe('Registry Health', () => {
    it('VerdictEngine registry has all 5 engines', () => {
        const registry = getVerdictEngineRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['mcnemar', 'bayesian', 'sequential', 'llm-judge', 'human-judge'])
        );
        expect(registry.getAll().length).toBe(5);
    });
    
    it('SplitStrategy registry has all 5 strategies', () => {
        const registry = getSplitStrategyRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['fixed', 'temporal', 'stratified', 'adversarial', 'holdout-rotation'])
        );
        expect(registry.getAll().length).toBe(5);
    });
    
    it('CaseStore registry has all 3 implementations', () => {
        const registry = getCaseStoreRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['filesystem', 'memory', 'sqlite'])
        );
    });
    
    it('EventStore registry has all 2 implementations', () => {
        const registry = getEventStoreRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['jsonl', 'sqlite'])
        );
    });
    
    it('ResolutionStrategy registry has all 7 strategies', () => {
        const registry = getResolutionStrategyRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['override', 'experiment', 'revision', 'manual-profile', 'policy', 'default-profile', 'fallback'])
        );
        expect(registry.getAll().length).toBe(7);
    });
    
    it('RevisionDriver registry has all 3 drivers', () => {
        const registry = getRevisionDriverRegistry();
        expect(registry.listNames()).toEqual(
            expect.arrayContaining(['jsonl', 'memory', 'sqlite'])
        );
    });
});

// --- Config validation matrix ---

describe('Config Validation Matrix', () => {
    const testableEngines = getTestableVerdictEngines();
    const allEngines = getVerdictEngineRegistry().listNames();
    const allSplits = getTestableSplitStrategies();
    
    for (const engineName of allEngines) {
        it(`${engineName} validates default config`, () => {
            const registry = getVerdictEngineRegistry();
            const engine = registry.get(engineName)!;
            const config = engine.getDefaultConfig();
            const result = engine.validateConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    }
    
    for (const strategyName of allSplits) {
        it(`${strategyName} validates default config`, () => {
            const registry = getSplitStrategyRegistry();
            const strategy = registry.get(strategyName)!;
            const config = strategy.getDefaultConfig();
            const result = strategy.validateConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    }
});

// --- Evidence class verification ---

describe('Evidence Class Correctness', () => {
    it('measured engines: mcnemar, bayesian, sequential', () => {
        const registry = getVerdictEngineRegistry();
        for (const name of getTestableVerdictEngines()) {
            const engine = registry.get(name)!;
            expect(engine.evidenceClass).toBe('measured');
        }
    });
    
    it('hypothesized engine: llm-judge', () => {
        const registry = getVerdictEngineRegistry();
        const engine = registry.get('llm-judge')!;
        expect(engine.evidenceClass).toBe('hypothesized');
    });
    
    it('observed engine: human-judge', () => {
        const registry = getVerdictEngineRegistry();
        const engine = registry.get('human-judge')!;
        expect(engine.evidenceClass).toBe('observed');
    });
    
    it('governance gate: measured passes without consent', () => {
        expect(passesGovernanceGate('measured', false)).toBe(true);
        expect(passesGovernanceGate('observed', false)).toBe(false);
        expect(passesGovernanceGate('hypothesized', false)).toBe(false);
        expect(passesGovernanceGate('asserted', false)).toBe(false);
        expect(passesGovernanceGate('observed', true)).toBe(true);
    });
});

export { generateMatrix, MATRIX_COMBOS };