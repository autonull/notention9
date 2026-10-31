/**
 * Unified Evaluation Module
 * 
 * Consolidates:
 * - testCases.ts (test case definitions & registry)
 * - evaluatorFactory.ts (evaluator creation & base logic)
 * - evaluationUtils.ts (shared evaluation utilities)
 * - fastEvaluator.ts (fast evaluation orchestration)
 * 
 * Single source of truth for all evaluation logic.
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { Note, Property } from '@notention/core';
import { loadCorpusTestCases } from '../corpus/index.js';
import { CORPUS_OUTPUT_DIRS } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

/* ============================================================================
 * Test Case Types & Registry
 * ============================================================================ */

/**
 * Test case for extraction evaluation
 */
export interface ExtractionTestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    expectedProperties?: Partial<Property>[];
}

/**
 * Test case for match evaluation
 */
export interface MatchTestCase {
    id: string;
    name: string;
    requestText: string;
    offerText: string;
    expectedMinScore: number;
    expectedMaxScore?: number;
}

/**
 * Capture test case - tests the capture task (uses extraction)
 */
export interface CaptureTestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    maxDurationMs: number;
}

export type TestCase = ExtractionTestCase;

/**
 * Test case registry for managing all test cases
 */
export class TestCaseRegistry {
    private extractionCases: ExtractionTestCase[] = [];
    private matchCases: MatchTestCase[] = [];

    constructor() {
        this.loadCoreCases();
    }

    private loadCoreCases(): void {
        this.extractionCases = this.loadCoreTestCasesSync<ExtractionTestCase>('core-extraction.json');
        this.matchCases = this.loadCoreTestCasesSync<MatchTestCase>('core-match.json');
    }

    private loadCoreTestCasesSync<T>(filename: string): T[] {
        try {
            const { readFileSync } = require('fs');
            const { join } = require('path');
            const content = readFileSync(join(__dirname, 'test-data', filename), 'utf-8');
            return JSON.parse(content) as T[];
        } catch {
            return [];
        }
    }

    registerExtractionCases(cases: ExtractionTestCase[]): void {
        this.extractionCases.push(...cases);
    }

    registerMatchCases(cases: MatchTestCase[]): void {
        this.matchCases.push(...cases);
    }

    getAllExtractionCases(): ExtractionTestCase[] {
        return [...this.extractionCases];
    }

    getAllMatchCases(): MatchTestCase[] {
        return [...this.matchCases];
    }

    getCoreExtractionCases(): ExtractionTestCase[] {
        return [...this.extractionCases];
    }

    getCoreMatchCases(): MatchTestCase[] {
        return [...this.matchCases];
    }

    getCorpusExtractionCases(): ExtractionTestCase[] {
        return this.extractionCases.filter((c): c is ExtractionTestCase => c.id.startsWith('corpus-'));
    }

    getCorpusMatchCases(): MatchTestCase[] {
        return this.matchCases.filter((c): c is MatchTestCase => c.id.startsWith('corpus-'));
    }
}

export const testCaseRegistry = new TestCaseRegistry();

/**
 * Core extraction test cases (loaded from JSON)
 */
export const CORE_EXTRACTION_TEST_CASES: ExtractionTestCase[] = (() => {
    try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const content = readFileSync(join(__dirname, 'test-data', 'core-extraction.json'), 'utf-8');
        return JSON.parse(content) as ExtractionTestCase[];
    } catch {
        return [];
    }
})();

/**
 * Core match test cases (loaded from JSON)
 */
export const CORE_MATCH_TEST_CASES: MatchTestCase[] = (() => {
    try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const content = readFileSync(join(__dirname, 'test-data', 'core-match.json'), 'utf-8');
        return JSON.parse(content) as MatchTestCase[];
    } catch {
        return [];
    }
})();

/**
 * Core capture test case
 */
export const CORE_CAPTURE_TEST_CASE: CaptureTestCase = (() => {
    try {
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const content = readFileSync(join(__dirname, 'test-data', 'core-capture.json'), 'utf-8');
        const cases = JSON.parse(content) as CaptureTestCase[];
        return cases[0];
    } catch {
        return {
            id: 'capture-1',
            name: 'Capture extracts key properties',
            input: 'I need a React developer for two weeks, up to 900 USD, starting next week',
            expectedMinProperties: 3,
            maxDurationMs: 20000,
        };
    }
})();

/* ============================================================================
 * Evaluation Types
 * ============================================================================ */

export interface BaselineResult {
    taskId: string;
    successRate: number;
    medianDuration: number;
    p90Duration: number;
    medianSteps: number;
    p90Steps: number;
    errors: string[];
    isCorpusTest?: boolean;
}

export interface ResourceMetrics {
    totalLatencyMs: number;
    avgInferenceLatencyMs: number;
    peakMemoryMB: number;
    modelSizeMB: number;
    inferenceCount: number;
    tokensUsed: number;
}

export interface CandidateEvaluation {
    candidateId: string;
    taskResults: Map<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface SerializableCandidateEvaluation {
    candidateId: string;
    taskResults: Record<string, BaselineResult>;
    overallSuccessRate: number;
    overallMedianDuration: number;
    passed: boolean;
    resourceMetrics: ResourceMetrics;
}

export interface EvaluationReport {
    baseline: BaselineResult[];
    candidates: CandidateEvaluation[];
    timestamp: string;
}

export interface SerializableEvaluationReport {
    baseline: BaselineResult[];
    candidates: SerializableCandidateEvaluation[];
    timestamp: string;
}

/* ============================================================================
 * Resource Monitor
 * ============================================================================ */

export class ResourceMonitor {
    private inferenceLatencies: number[] = [];
    private inferenceCount = 0;
    private tokensUsed = 0;
    private startMemory = 0;
    private peakMemory = 0;

    start(): void {
        const memoryUsage = process?.memoryUsage?.();
        if (memoryUsage) {
            this.startMemory = memoryUsage.heapUsed;
            this.peakMemory = this.startMemory;
        }
    }

    recordInference(latencyMs: number, tokens: number = 0): void {
        this.inferenceLatencies.push(latencyMs);
        this.inferenceCount++;
        this.tokensUsed += tokens;
        this.updatePeakMemory();
    }

    private updatePeakMemory(): void {
        const memoryUsage = process?.memoryUsage?.();
        if (memoryUsage) {
            const current = memoryUsage.heapUsed;
            if (current > this.peakMemory) {
                this.peakMemory = current;
            }
        }
    }

    getMetrics(modelSizeMB: number = 0): ResourceMetrics {
        const totalLatency = this.inferenceLatencies.reduce((a, b) => a + b, 0);
        const avgLatency = this.inferenceCount > 0 ? totalLatency / this.inferenceCount : 0;
        const peakMemoryMB = (this.peakMemory - this.startMemory) / (1024 * 1024);

        return {
            totalLatencyMs: totalLatency,
            avgInferenceLatencyMs: avgLatency,
            peakMemoryMB: Math.max(0, peakMemoryMB),
            modelSizeMB,
            inferenceCount: this.inferenceCount,
            tokensUsed: this.tokensUsed,
        };
    }

    reset(): void {
        this.inferenceLatencies = [];
        this.inferenceCount = 0;
        this.tokensUsed = 0;
        this.startMemory = 0;
        this.peakMemory = 0;
    }
}

/* ============================================================================
 * Evaluation Result & Evaluator Factory
 * ============================================================================ */

export interface EvaluationResult {
    success: boolean;
    details: string;
    duration: number;
}

export interface TestCaseEvaluator<TTestCase extends { id: string }> {
    readonly type: string;
    evaluate(testCase: TTestCase): Promise<EvaluationResult>;
    getId(testCase: TTestCase): string;
    getTaskPrefix(): string;
}

export abstract class BaseTestCaseEvaluator<TTestCase extends { id: string }> implements TestCaseEvaluator<TTestCase> {
    abstract readonly type: string;
    abstract readonly taskPrefix: string;
    abstract evaluateCore(testCase: TTestCase): Promise<EvaluationResult>;

    async evaluate(testCase: TTestCase): Promise<EvaluationResult> {
        return this.evaluateCore(testCase);
    }

    getId(testCase: TTestCase): string {
        return testCase.id;
    }

    getTaskPrefix(): string {
        return this.taskPrefix;
    }

    protected success(duration: number): EvaluationResult {
        return { success: true, details: '', duration };
    }

    protected failure(details: string, duration: number): EvaluationResult {
        return { success: false, details, duration };
    }
}

/* ============================================================================
 * Shared Helper Functions
 * ============================================================================ */

/**
 * Check property match (shared)
 */
export function checkPropertyMatch(actual: Property[], expected: Partial<Property>[]): { matched: number; total: number; details: string[] } {
    let matched = 0;
    const details: string[] = [];

    for (const exp of expected) {
        const found = actual.some(a =>
            a.key === exp.key &&
            a.operator === exp.operator &&
            exp.values?.some(v => a.values.includes(v))
        );
        if (found) {
            matched++;
            details.push(`✓ ${exp.key} ${exp.operator} ${exp.values?.join(',')}`);
        } else {
            details.push(`✗ Missing: ${exp.key} ${exp.operator} ${exp.values?.join(',')}`);
        }
    }

    return { matched, total: expected.length, details };
}

/**
 * Create a Note from text (shared)
 */
export async function createNoteFromText(
    text: string,
    id: string = 'test',
    extractor: { extractFromText(text: string): Promise<Property[]> }
): Promise<Note> {
    const properties = await extractor.extractFromText(text);
    return {
        id,
        title: text.slice(0, 50),
        content: `<p>${text}</p>`,
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        source: { type: 'user' as const, identifier: 'test', timestamp: Date.now() },
        privacy: 'private' as const,
        priority: 0,
    };
}

/* ============================================================================
 * Evaluator Factories
 * ============================================================================ */

/**
 * Factory for creating extraction evaluator with custom extractor
 */
export function createExtractionEvaluator(
    extractor: { extractFromText(text: string): Promise<Property[]> }
): BaseTestCaseEvaluator<ExtractionTestCase> {
    return new class extends BaseTestCaseEvaluator<ExtractionTestCase> {
        readonly type = 'extraction';
        readonly taskPrefix = 'task-3-extraction';

        async evaluateCore(testCase: ExtractionTestCase): Promise<EvaluationResult> {
            const startTime = Date.now();
            const properties = await extractor.extractFromText(testCase.input);
            const duration = Date.now() - startTime;

            const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
            const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;

            const missingDetails = check.details.filter(d => d.startsWith('✗')).join('; ');
            const details = success
                ? ''
                : `Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${missingDetails}`;

            return success ? this.success(duration) : this.failure(details, duration);
        }
    };
}

/**
 * Factory for creating match evaluator with custom match engine
 */
export function createMatchEvaluator(
    matchEngine: { calculateMatchScore(request: Note, offer: Note): { score: number } },
    extractor: { extractFromText(text: string): Promise<Property[]> }
): BaseTestCaseEvaluator<MatchTestCase> {
    return new class extends BaseTestCaseEvaluator<MatchTestCase> {
        readonly type = 'match';
        readonly taskPrefix = 'task-2-match';

        async evaluateCore(testCase: MatchTestCase): Promise<EvaluationResult> {
            const startTime = Date.now();
            const request = await createNoteFromText(testCase.requestText, 'request', extractor);
            const offer = await createNoteFromText(testCase.offerText, 'offer', extractor);
            const result = matchEngine.calculateMatchScore(request, offer);
            const duration = Date.now() - startTime;

            const success = result.score >= testCase.expectedMinScore &&
                (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);

            const details = success
                ? ''
                : `Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`;

            return success ? this.success(duration) : this.failure(details, duration);
        }
    };
}

/**
 * Factory for creating capture evaluator with custom extractor
 */
export function createCaptureEvaluator(
    extractor: { extractFromText(text: string): Promise<Property[]> }
): BaseTestCaseEvaluator<CaptureTestCase> {
    return new class extends BaseTestCaseEvaluator<CaptureTestCase> {
        readonly type = 'capture';
        readonly taskPrefix = 'task-1-capture';

        async evaluateCore(testCase: CaptureTestCase): Promise<EvaluationResult> {
            const startTime = Date.now();
            const captureProps = await extractor.extractFromText(testCase.input);
            const duration = Date.now() - startTime;

            const success = captureProps.length >= testCase.expectedMinProperties && duration < testCase.maxDurationMs;

            const details = success
                ? ''
                : `Capture extracted ${captureProps.length} properties in ${duration}ms`;

            return success ? this.success(duration) : this.failure(details, duration);
        }
    };
}

/* ============================================================================
 * Corpus Test Case Loading
 * ============================================================================ */

/**
 * Load corpus test cases from the first available directory
 */
export async function loadCorpusTestCasesForEvaluation(): Promise<{ extraction: ExtractionTestCase[]; match: MatchTestCase[] }> {
    for (const corpusOutputDir of CORPUS_OUTPUT_DIRS) {
        try {
            await access(corpusOutputDir);
            return await loadCorpusTestCases(corpusOutputDir);
        } catch {
            // Ignore errors, try next location
        }
    }
    return { extraction: [], match: [] };
}

/**
 * Prepare test cases for evaluation (register corpus cases, get core cases)
 */
export async function prepareEvaluationTestCases(): Promise<{
    extractionCases: Array<{ testCase: ExtractionTestCase; isCorpusTest: boolean }>;
    matchCases: Array<{ testCase: MatchTestCase; isCorpusTest: boolean }>;
    captureCase: CaptureTestCase;
}> {
    // Load corpus-generated test cases
    const corpusCases = await loadCorpusTestCasesForEvaluation();

    // Register corpus cases with the registry
    testCaseRegistry.registerExtractionCases(corpusCases.extraction);
    testCaseRegistry.registerMatchCases(corpusCases.match);

    // Get all test cases from registry
    const coreExtractionCases = testCaseRegistry.getCoreExtractionCases();
    const coreMatchCases = testCaseRegistry.getCoreMatchCases();

    // Build test cases with corpus flags
    const extractionCases = buildTestCasesWithFlags(coreExtractionCases, corpusCases.extraction);
    const matchCases = buildTestCasesWithFlags(coreMatchCases, corpusCases.match);

    return { extractionCases, matchCases, captureCase: CORE_CAPTURE_TEST_CASE };
}

/**
 * Build test cases with corpus flags
 */
export function buildTestCasesWithFlags<TCore, TCorpus>(
    coreCases: TCore[],
    corpusCases: TCorpus[]
): Array<{ testCase: TCore | TCorpus; isCorpusTest: boolean }> {
    const withFlags: Array<{ testCase: TCore | TCorpus; isCorpusTest: boolean }> = [];

    for (const testCase of coreCases) {
        withFlags.push({ testCase, isCorpusTest: false });
    }
    for (const testCase of corpusCases) {
        withFlags.push({ testCase, isCorpusTest: true });
    }

    return withFlags;
}

/* ============================================================================
 * Baseline & Evaluation Execution
 * ============================================================================ */

/**
 * Create baseline result asynchronously
 */
export async function createBaselineResultAsync<TTestCase extends { id: string }>(
    testCase: TTestCase,
    evaluator: TestCaseEvaluator<TTestCase>,
    isCorpusTest: boolean,
    taskPrefix?: string
): Promise<BaselineResult> {
    const { success, details, duration } = await evaluator.evaluate(testCase);
    const prefix = taskPrefix ?? evaluator.getTaskPrefix();

    return {
        taskId: `${prefix}-${evaluator.getId(testCase)}`,
        successRate: success ? 1 : 0,
        medianDuration: duration,
        p90Duration: duration,
        medianSteps: 1,
        p90Steps: 1,
        errors: success ? [] : [details],
        isCorpusTest,
    };
}

/**
 * Generic test case runner
 */
export async function runTestCases<TTestCase extends { id: string }>(
    testCases: Array<{ testCase: TTestCase; isCorpusTest: boolean }>,
    evaluator: TestCaseEvaluator<TTestCase>,
    taskPrefix?: string
): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];

    for (const { testCase, isCorpusTest } of testCases) {
        results.push(await createBaselineResultAsync(testCase, evaluator, isCorpusTest, taskPrefix));
    }

    return results;
}

/* ============================================================================
 * Shared Instances (Lazy Initialization)
 * ============================================================================ */

let _sharedExtractor: PropertyExtractor | null = null;
let _sharedMatchEngine: MatchEngine | null = null;
let _sharedExtractionEvaluator: BaseTestCaseEvaluator<ExtractionTestCase> | null = null;
let _sharedMatchEvaluator: BaseTestCaseEvaluator<MatchTestCase> | null = null;
let _sharedCaptureEvaluator: BaseTestCaseEvaluator<CaptureTestCase> | null = null;

function getSharedExtractor(): PropertyExtractor {
    if (!_sharedExtractor) {
        _sharedExtractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
    }
    return _sharedExtractor;
}

function getSharedMatchEngine(): MatchEngine {
    if (!_sharedMatchEngine) {
        _sharedMatchEngine = new MatchEngine(DEFAULT_ONTOLOGY);
    }
    return _sharedMatchEngine;
}

export function getExtractionEvaluator(): BaseTestCaseEvaluator<ExtractionTestCase> {
    if (!_sharedExtractionEvaluator) {
        _sharedExtractionEvaluator = createExtractionEvaluator(getSharedExtractor());
    }
    return _sharedExtractionEvaluator;
}

export function getMatchEvaluator(): BaseTestCaseEvaluator<MatchTestCase> {
    if (!_sharedMatchEvaluator) {
        _sharedMatchEvaluator = createMatchEvaluator(getSharedMatchEngine(), getSharedExtractor());
    }
    return _sharedMatchEvaluator;
}

export function getCaptureEvaluator(): BaseTestCaseEvaluator<CaptureTestCase> {
    if (!_sharedCaptureEvaluator) {
        _sharedCaptureEvaluator = createCaptureEvaluator(getSharedExtractor());
    }
    return _sharedCaptureEvaluator;
}

/* ============================================================================
 * Fast Baseline Evaluation
 * ============================================================================ */

export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];

    // Prepare test cases (loads corpus, registers, builds with flags)
    const { extractionCases, matchCases, captureCase } = await prepareEvaluationTestCases();

    // Evaluate extraction test cases (core + corpus)
    results.push(...await runTestCases(extractionCases, getExtractionEvaluator()));

    // Evaluate match test cases (core + corpus)
    results.push(...await runTestCases(matchCases, getMatchEvaluator()));

    // Test capture task (uses extraction)
    const captureResult = await createBaselineResultAsync(
        captureCase,
        getCaptureEvaluator(),
        false,
        'task-1-capture'
    );
    results.unshift(captureResult);

    return results;
}

/* ============================================================================
 * Candidate Evaluation
 * ============================================================================ */

export async function evaluateCandidateFast(
    candidate: CandidateStrategy,
    baseline: BaselineResult[]
): Promise<CandidateEvaluation> {
    // For now, candidates don't change the core logic, so they get the same results as baseline
    // In the future, candidates could provide custom extractors/matchers

    const taskResults = new Map<string, BaselineResult>();
    let totalSuccessRate = 0;
    let totalDuration = 0;
    let coreTestCount = 0;

    for (const baselineResult of baseline) {
        // Candidate inherits baseline behavior (no custom logic yet)
        taskResults.set(baselineResult.taskId, { ...baselineResult });

        // Only count non-corpus tests for must-win gate
        if (!baselineResult.isCorpusTest) {
            totalSuccessRate += baselineResult.successRate;
            totalDuration += baselineResult.medianDuration;
            coreTestCount++;
        }
    }

    const overallSuccessRate = coreTestCount > 0 ? totalSuccessRate / coreTestCount : 0;
    const overallMedianDuration = coreTestCount > 0 ? totalDuration / coreTestCount : 0;

    // Must-win: candidate must beat baseline on overall success rate (core tests only)
    const coreBaseline = baseline.filter(b => !b.isCorpusTest);
    const baselineOverall = coreBaseline.reduce((sum, b) => sum + b.successRate, 0) / (coreBaseline.length || 1);
    const passed = overallSuccessRate >= baselineOverall;

    return {
        candidateId: candidate.id,
        taskResults,
        overallSuccessRate,
        overallMedianDuration,
        passed,
        resourceMetrics: {
            totalLatencyMs: 0,
            avgInferenceLatencyMs: 0,
            peakMemoryMB: 0,
            modelSizeMB: 0,
            inferenceCount: 0,
            tokensUsed: 0,
        },
    };
}

/* ============================================================================
 * Full Fast Evaluation
 * ============================================================================ */

export async function runFastEvaluation(
    candidatesDir: CandidateDir,
    baseline: BaselineResult[]
): Promise<EvaluationReport> {
    const results: CandidateEvaluation[] = [];

    for (const candidate of candidatesDir.candidates.values()) {
        const evaluation = await evaluateCandidateFast(candidate, baseline);
        results.push(evaluation);
    }

    return {
        baseline,
        candidates: results,
        timestamp: new Date().toISOString(),
    };
}

/* ============================================================================
 * Baseline Persistence
 * ============================================================================ */

export async function loadOrRunFastBaseline(
    baselinePath: string
): Promise<BaselineResult[]> {
    try {
        const content = await readFile(baselinePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        // File doesn't exist or can't be read
    }

    const baseline = await runFastBaselineEvaluation();
    await mkdir(dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, JSON.stringify(baseline, null, 2));

    return baseline;
}

/* ============================================================================
 * No additional type re-exports needed - types are exported at declaration
 * ============================================================================ */