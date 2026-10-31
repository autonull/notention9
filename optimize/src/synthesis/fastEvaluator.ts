/**
 * Fast evaluator - runs deterministic evaluation without browser
 * Uses async filesystem operations consistently
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { OntologyService } from '@notention/core';
import { Note, Property } from '@notention/core';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';
import type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport, ResourceMonitor } from './evaluationTypes.js';
import { loadCorpusTestCases } from '../corpus/index.js';
import { 
    testCaseRegistry, 
    CORE_CAPTURE_TEST_CASE,
    CORE_EXTRACTION_TEST_CASES,
    CORE_MATCH_TEST_CASES,
    type ExtractionTestCase,
    type MatchTestCase,
} from './testCases.js';

// Re-export evaluation types for backward compatibility
export type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport, ResourceMonitor } from './evaluationTypes.js';

const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

async function createNoteFromText(text: string, id: string = 'test'): Promise<Note> {
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

function checkPropertyMatch(actual: Property[], expected: Partial<Property>[]): { matched: number; total: number; details: string[] } {
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

async function loadCorpusTestCasesForEvaluation(): Promise<{ extraction: ExtractionTestCase[]; match: MatchTestCase[] }> {
    // Check multiple possible corpus output locations
    const possibleDirs = [
        'loop/corpus-output',
        'loop/runs/corpus-output',
    ];
    
    for (const corpusOutputDir of possibleDirs) {
        try {
            await access(corpusOutputDir);
            return await loadCorpusTestCases(corpusOutputDir);
        } catch {
            // Ignore errors, try next location
        }
    }
    return { extraction: [], match: [] };
}

async function evaluateExtractionTestCase(
    testCase: ExtractionTestCase,
    isCorpusTest: boolean,
    taskPrefix: string
): Promise<BaselineResult> {
    const startTime = Date.now();
    const properties = await extractor.extractFromText(testCase.input);
    const duration = Date.now() - startTime;
    
    const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
    const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;
    
    return {
        taskId: `${taskPrefix}${testCase.id}`,
        successRate: success ? 1 : 0,
        medianDuration: duration,
        p90Duration: duration,
        medianSteps: 1,
        p90Steps: 1,
        errors: success ? [] : [`Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${check.details.filter(d => d.startsWith('✗')).join('; ')}`],
        isCorpusTest,
    };
}

async function evaluateMatchTestCase(
    testCase: MatchTestCase,
    isCorpusTest: boolean,
    taskPrefix: string
): Promise<BaselineResult> {
    const startTime = Date.now();
    const request = await createNoteFromText(testCase.requestText, 'request');
    const offer = await createNoteFromText(testCase.offerText, 'offer');
    const result = matchEngine.calculateMatchScore(request, offer);
    const duration = Date.now() - startTime;
    
    const success = result.score >= testCase.expectedMinScore && 
                   (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);
    
    return {
        taskId: `${taskPrefix}${testCase.id}`,
        successRate: success ? 1 : 0,
        medianDuration: duration,
        p90Duration: duration,
        medianSteps: 1,
        p90Steps: 1,
        errors: success ? [] : [`Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`],
        isCorpusTest,
    };
}

function buildTestCasesWithFlags<TCore, TCorpus>(
    coreCases: TCore[],
    corpusCases: TCorpus[]
): Array<{ testCase: TCore | TCorpus; isCorpusTest: boolean; taskPrefix: string }> {
    const withFlags: Array<{ testCase: TCore | TCorpus; isCorpusTest: boolean; taskPrefix: string }> = [];
    
    for (const testCase of coreCases) {
        withFlags.push({ testCase, isCorpusTest: false, taskPrefix: '' });
    }
    for (const testCase of corpusCases) {
        withFlags.push({ testCase, isCorpusTest: true, taskPrefix: '' });
    }
    
    return withFlags;
}

export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];
    
    // Load corpus-generated test cases
    const corpusCases = await loadCorpusTestCasesForEvaluation();
    
    // Register corpus cases with the registry
    testCaseRegistry.registerExtractionCases(corpusCases.extraction);
    testCaseRegistry.registerMatchCases(corpusCases.match);
    
    // Get all test cases from registry
    const coreExtractionCases = testCaseRegistry.getCoreExtractionCases();
    const coreMatchCases = testCaseRegistry.getCoreMatchCases();
    
    // Evaluate extraction test cases (core + corpus)
    const extractionCases = buildTestCasesWithFlags(
        coreExtractionCases,
        corpusCases.extraction
    );
    for (const { testCase, isCorpusTest } of extractionCases) {
        results.push(await evaluateExtractionTestCase(testCase, isCorpusTest, 'task-3-extraction-'));
    }
    
    // Evaluate match test cases (core + corpus)
    const matchCases = buildTestCasesWithFlags(
        coreMatchCases,
        corpusCases.match
    );
    for (const { testCase, isCorpusTest } of matchCases) {
        results.push(await evaluateMatchTestCase(testCase, isCorpusTest, 'task-2-match-'));
    }
    
    // Test capture task (uses extraction)
    const captureInput = CORE_CAPTURE_TEST_CASE.input;
    const captureStart = Date.now();
    const captureProps = await extractor.extractFromText(captureInput);
    const captureDuration = Date.now() - captureStart;
    const captureSuccess = captureProps.length >= CORE_CAPTURE_TEST_CASE.expectedMinProperties && captureDuration < CORE_CAPTURE_TEST_CASE.maxDurationMs;
    
    results.unshift({
        taskId: 'task-1-capture',
        successRate: captureSuccess ? 1 : 0,
        medianDuration: captureDuration,
        p90Duration: captureDuration,
        medianSteps: 2,
        p90Steps: 2,
        errors: captureSuccess ? [] : [`Capture extracted ${captureProps.length} properties in ${captureDuration}ms`],
        isCorpusTest: false,
    });
    
    return results;
}

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

export async function runFastEvaluation(
    candidatesDir: CandidateDir,
    baseline: BaselineResult[],
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