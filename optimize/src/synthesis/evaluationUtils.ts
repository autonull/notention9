/**
 * Shared evaluation utilities for fast evaluator
 * Consolidates common patterns between extraction and match evaluation
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';
import type { BaselineResult } from './evaluationTypes.js';
import {
    testCaseRegistry,
    CORE_CAPTURE_TEST_CASE,
    CORE_EXTRACTION_TEST_CASES,
    CORE_MATCH_TEST_CASES,
    type ExtractionTestCase,
    type MatchTestCase,
    type CaptureTestCase,
} from './testCases.js';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { Note, Property } from '@notention/core';
import { loadCorpusTestCases } from '../corpus/index.js';
import { CORPUS_OUTPUT_DIRS } from '../constants.js';
import {
    createExtractionEvaluator,
    createMatchEvaluator,
    createCaptureEvaluator,
    checkPropertyMatch,
    createNoteFromText,
} from './evaluatorFactory.js';

// Shared instances
const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

// Pre-built evaluators using the factory
export const extractionEvaluator = createExtractionEvaluator(extractor);
export const matchEvaluator = createMatchEvaluator(matchEngine, extractor);
export const captureEvaluator = createCaptureEvaluator(extractor);

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

// Re-export from evaluatorFactory
export { createExtractionEvaluator, createMatchEvaluator, createCaptureEvaluator };
export { checkPropertyMatch, createNoteFromText };
export type { ExtractionTestCase, MatchTestCase, CaptureTestCase, EvaluationResult, BaseTestCaseEvaluator } from './evaluatorFactory.js';
import type { TestCaseEvaluator } from './evaluatorFactory.js';

/**
 * Async version of createBaselineResult (since evaluator.evaluate is async)
 */
export async function createBaselineResultAsync<TTestCase extends { id: string }>(
    testCase: TTestCase,
    evaluator: TestCaseEvaluator<TTestCase>,
    isCorpusTest: boolean,
    taskPrefix?: string
): Promise<BaselineResult> {
    const { success, details, duration } = await evaluator.evaluate(testCase);
    const prefix = taskPrefix ?? evaluator.type;

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
 * Generic test case runner that handles the common pattern
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

/**
 * Build test cases with corpus flags (extracted from fastEvaluator)
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