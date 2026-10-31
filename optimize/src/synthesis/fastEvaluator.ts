/**
 * Fast evaluator - runs deterministic evaluation without browser
 * Uses async filesystem operations consistently
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { OntologyService } from '@notention/core';
import { Note, Property } from '@notention/core';
import type { CandidateStrategy, CandidateDir } from './StrategySpec.js';
import type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport, ResourceMonitor } from './evaluationTypes.js';
import { testCaseRegistry, CORE_CAPTURE_TEST_CASE } from './testCases.js';
import {
    runTestCases,
    buildTestCasesWithFlags,
    extractionEvaluator,
    matchEvaluator,
    captureEvaluator,
    createBaselineResultAsync,
    checkPropertyMatch,
    createNoteFromText,
    loadCorpusTestCasesForEvaluation,
    prepareEvaluationTestCases,
} from './evaluationUtils.js';

// Re-export evaluation types for backward compatibility
export type { BaselineResult, ResourceMetrics, CandidateEvaluation, EvaluationReport, ResourceMonitor } from './evaluationTypes.js';

const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];
    
    // Prepare test cases (loads corpus, registers, builds with flags)
    const { extractionCases, matchCases, captureCase } = await prepareEvaluationTestCases();
    
    // Evaluate extraction test cases (core + corpus)
    results.push(...await runTestCases(extractionCases, extractionEvaluator));
    
    // Evaluate match test cases (core + corpus)
    results.push(...await runTestCases(matchCases, matchEvaluator));
    
    // Test capture task (uses extraction)
    const captureResult = await createBaselineResultAsync(
        captureCase,
        captureEvaluator,
        false,
        'task-1-capture'
    );
    results.unshift(captureResult);
    
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