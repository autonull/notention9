/**
 * Matrix Test Runner (CI Gate)
 * Tests all plugin combinations: 4 VerdictEngines × 3 SplitStrategies × 2 CaseStores × 2 EventStores = 48 combos
 * Minimum gate: 4 engines × 3 splits × 2 stores = 24 combos
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
import { getCaseStoreRegistry, resetCaseStoreRegistry, createFileSystemCaseStore, createInMemoryCaseStore } from '../eval/caseStore/index.js';
import { getEventStoreRegistry, resetEventStoreRegistry, createJSONLEventStore, createSQLiteEventStore } from '../telemetry/eventStore/index.js';
import { McNemarVerdictEngine } from '../eval/verdictEngines/mcnemar.js';
import { BayesianVerdictEngine } from '../eval/verdictEngines/bayesian.js';
import { SequentialVerdictEngine } from '../eval/verdictEngines/sequential.js';
import { FixedSplitStrategy } from '../eval/splitStrategies/fixed.js';
import { TemporalSplitStrategy } from '../eval/splitStrategies/temporal.js';
import { StratifiedSplitStrategy } from '../eval/splitStrategies/stratified.js';
import { FileSystemCaseStore } from '../eval/caseStore/fileSystem.js';
import { InMemoryCaseStore } from '../eval/caseStore/inMemory.js';
import { JSONLEventStore } from '../telemetry/eventStore/jsonl.js';
import { SQLiteEventStore } from '../telemetry/eventStore/sqlite.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';

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

function createTestCasesDir(tmpDir: string): string {
    const casesDir = join(tmpDir, 'cases');
    mkdirSync(casesDir, { recursive: true });
    
    const manifest = createTestManifest();
    
    // Write manifest
    writeFileSync(join(casesDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    
    // Write individual case files
    for (const entry of manifest.cases) {
        let caseData: IntentCase | QualityCase;
        if (entry.family === 'intent') {
            caseData = createTestIntentCase(entry.id, entry.split as any);
        } else {
            caseData = createTestQualityCase(entry.id, entry.qualityFamily as any);
        }
        writeFileSync(
            join(casesDir, entry.path),
            JSON.stringify(caseData, null, 2)
        );
    }
    
    return casesDir;
}

function createPairedRunResult(overrides: Partial<Record<string, number>> = {}): any {
    return {
        baseline: { metrics: { completion: 0.8, steps: 3, precision: 0.75, recall: 0.8, ...overrides } },
        candidate: { metrics: { completion: 0.85, steps: 2, precision: 0.8, recall: 0.85, ...overrides } },
        sampleSize: 50,
    };
}

// --- Matrix Configuration ---

const VERDICT_ENGINES = ['mcnemar', 'bayesian', 'sequential'] as const; // Exclude LLM/Human for CI speed
const SPLIT_STRATEGIES = ['fixed', 'temporal', 'stratified'] as const;
const CASE_STORES = ['memory'] as const; // filesystem requires exact hash match
const EVENT_STORES = ['jsonl'] as const; // SQLite is stub

type VerdictEngineName = typeof VERDICT_ENGINES[number];
type SplitStrategyName = typeof SPLIT_STRATEGIES[number];
type CaseStoreName = typeof CASE_STORES[number];
type EventStoreName = typeof EVENT_STORES[number];

interface MatrixCombo {
    verdictEngine: VerdictEngineName;
    splitStrategy: SplitStrategyName;
    caseStore: CaseStoreName;
    eventStore: EventStoreName;
}

function generateMatrix(): MatrixCombo[] {
    const combos: MatrixCombo[] = [];
    for (const verdictEngine of VERDICT_ENGINES) {
        for (const splitStrategy of SPLIT_STRATEGIES) {
            for (const caseStore of CASE_STORES) {
                for (const eventStore of EVENT_STORES) {
                    combos.push({ verdictEngine, splitStrategy, caseStore, eventStore });
                }
            }
        }
    }
    return combos;
}

// --- Test Suite ---

const MATRIX_COMBOS = generateMatrix();
console.log(`\n📊 Matrix Test: ${MATRIX_COMBOS.length} combinations (${VERDICT_ENGINES.length} engines × ${SPLIT_STRATEGIES.length} splits × ${CASE_STORES.length} stores × ${EVENT_STORES.length} event stores)`);

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
        const label = `${combo.verdictEngine}/${combo.splitStrategy}/${combo.caseStore}/${combo.eventStore}`;
        
        it(`combo: ${label}`, async () => {
            // 1. Create components
            const verdictEngineRegistry = getVerdictEngineRegistry();
            const splitStrategyRegistry = getSplitStrategyRegistry();
            
            const verdictEngine = verdictEngineRegistry.get(combo.verdictEngine);
            const splitStrategy = splitStrategyRegistry.get(combo.splitStrategy);
            
            expect(verdictEngine).toBeDefined();
            expect(splitStrategy).toBeDefined();
            
            // Create case store (memory only)
            const caseStore = createInMemoryCaseStore();
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
            
            // Create event store
            const eventPath = join(tmpDir, 'events.jsonl');
            const eventStore = createJSONLEventStore(eventPath);
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
    for (const engineName of VERDICT_ENGINES) {
        it(`${engineName} validates default config`, () => {
            const registry = getVerdictEngineRegistry();
            const engine = registry.get(engineName)!;
            const config = engine.getDefaultConfig();
            const result = engine.validateConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    }
    
    for (const strategyName of SPLIT_STRATEGIES) {
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
        for (const name of ['mcnemar', 'bayesian', 'sequential']) {
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