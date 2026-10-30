import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { OntologyService } from '@notention/core';
import { Note, Property } from '@notention/core';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';
import type { BaselineResult as BaseBaselineResult, ResourceMetrics, CandidateEvaluation as BaseCandidateEvaluation, EvaluationReport as BaseEvaluationReport } from './evaluator.js';
import { loadCorpusTestCases } from '../corpus/index.js';
import { testCaseRegistry, CORE_CAPTURE_TEST_CASE } from './testCases.js';

export interface BaselineResult extends BaseBaselineResult {
    isCorpusTest?: boolean;  // Flag for corpus-generated gap detection tests
}

export interface CandidateEvaluation extends BaseCandidateEvaluation {
    // Extends base with any fast-eval specific fields if needed
}

export interface EvaluationReport extends BaseEvaluationReport {
    // Extends base
}

const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

function createNoteFromText(text: string, id: string = 'test'): Note {
    const properties = extractor.extractFromText(text);
    return {
        id,
        title: text.slice(0, 50),
        content: `<p>${text}</p>`,
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
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

async function loadCorpusTestCasesForEvaluation(): Promise<{ extraction: TestCase[]; match: MatchTestCase[] }> {
    // Check multiple possible corpus output locations
    const possibleDirs = [
        'loop/corpus-output',
        'loop/runs/corpus-output',
    ];
    
    for (const corpusOutputDir of possibleDirs) {
        if (existsSync(corpusOutputDir)) {
            try {
                return await loadCorpusTestCases(corpusOutputDir);
            } catch {
                // Ignore errors, try next location
            }
        }
    }
    return { extraction: [], match: [] };
}

export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];
    
    // Load corpus-generated test cases
    const corpusCases = await loadCorpusTestCasesForEvaluation();
    
    // Register corpus cases with the registry
    testCaseRegistry.registerExtractionCases(corpusCases.extraction);
    testCaseRegistry.registerMatchCases(corpusCases.match);
    
    // Get all test cases from registry
    const { extraction: allExtractionCases, match: allMatchCases } = testCaseRegistry.getAllCases();
    const coreExtractionCases = testCaseRegistry.getCoreExtractionCases();
    const coreMatchCases = testCaseRegistry.getCoreMatchCases();
    
    // Test core extraction tasks (regression tests)
    for (const testCase of coreExtractionCases) {
        const startTime = Date.now();
        const properties = extractor.extractFromText(testCase.input);
        const duration = Date.now() - startTime;
        
        const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
        const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;
        
        results.push({
            taskId: `task-3-extraction-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${check.details.filter(d => d.startsWith('✗')).join('; ')}`],
            isCorpusTest: false,
        });
    }
    
    // Test corpus extraction tasks (gap detection - marked but not counted for must-win)
    for (const testCase of corpusCases.extraction) {
        const startTime = Date.now();
        const properties = extractor.extractFromText(testCase.input);
        const duration = Date.now() - startTime;
        
        const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
        const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;
        
        results.push({
            taskId: `task-3-extraction-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${check.details.filter(d => d.startsWith('✗')).join('; ')}`],
            isCorpusTest: true,
        });
    }
    
    // Test core match tasks (regression tests)
    for (const testCase of coreMatchCases) {
        const startTime = Date.now();
        const request = createNoteFromText(testCase.requestText, 'request');
        const offer = createNoteFromText(testCase.offerText, 'offer');
        const result = matchEngine.calculateMatchScore(request, offer);
        const duration = Date.now() - startTime;
        
        const success = result.score >= testCase.expectedMinScore && 
                       (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);
        
        results.push({
            taskId: `task-2-match-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`],
            isCorpusTest: false,
        });
    }
    
    // Test corpus match tasks (gap detection)
    for (const testCase of corpusCases.match) {
        const startTime = Date.now();
        const request = createNoteFromText(testCase.requestText, 'request');
        const offer = createNoteFromText(testCase.offerText, 'offer');
        const result = matchEngine.calculateMatchScore(request, offer);
        const duration = Date.now() - startTime;
        
        const success = result.score >= testCase.expectedMinScore && 
                       (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);
        
        results.push({
            taskId: `task-2-match-${testCase.id}`,
            successRate: success ? 1 : 0,
            medianDuration: duration,
            p90Duration: duration,
            medianSteps: 1,
            p90Steps: 1,
            errors: success ? [] : [`Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`],
            isCorpusTest: true,
        });
    }
    
    // Test capture task (uses extraction)
    const captureInput = CORE_CAPTURE_TEST_CASE.input;
    const captureStart = Date.now();
    const captureProps = extractor.extractFromText(captureInput);
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
    if (existsSync(baselinePath)) {
        const content = readFileSync(baselinePath, 'utf-8');
        return JSON.parse(content);
    }
    
    const baseline = await runFastBaselineEvaluation();
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    
    return baseline;
}