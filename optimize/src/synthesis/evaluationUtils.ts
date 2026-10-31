/**
 * Shared evaluation utilities for fast evaluator
 * Consolidates common patterns between extraction and match evaluation
 */

import type { BaselineResult } from './evaluationTypes.js';
import type { ExtractionTestCase, MatchTestCase, CaptureTestCase } from './testCases.js';
import { PropertyExtractor } from '@notention/core';
import { MatchEngine } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import type { Note, Property } from '@notention/core';

const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const matchEngine = new MatchEngine(DEFAULT_ONTOLOGY);

/**
 * Common interface for test case evaluators
 */
export interface TestCaseEvaluator<TTestCase> {
    /** Unique identifier for this evaluator type */
    readonly type: string;
    
    /** Run the test case and return raw result */
    evaluate(testCase: TTestCase): Promise<{ success: boolean; details: string; duration: number }>;
    
    /** Get the test case ID for task naming */
    getId(testCase: TTestCase): string;
    
    /** Convert test case to a task ID prefix */
    getTaskPrefix(testCase: TTestCase): string;
}

/**
 * Async version of createBaselineResult (since evaluator.evaluate is async)
 */
export async function createBaselineResultAsync<TTestCase>(
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
export async function runTestCases<TTestCase>(
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

/**
 * Extraction test case evaluator
 */
export const extractionEvaluator: TestCaseEvaluator<ExtractionTestCase> = {
    type: 'extraction',
    
    async evaluate(testCase: ExtractionTestCase) {
        const startTime = Date.now();
        const properties = await extractor.extractFromText(testCase.input);
        const duration = Date.now() - startTime;
        
        const check = checkPropertyMatch(properties, testCase.expectedProperties || []);
        const success = properties.length >= testCase.expectedMinProperties && check.matched === check.total;
        
        const missingDetails = check.details.filter(d => d.startsWith('✗')).join('; ');
        const details = success 
            ? '' 
            : `Extracted ${properties.length} properties, expected ≥${testCase.expectedMinProperties}. Missing: ${missingDetails}`;
        
        return { success, details, duration };
    },
    
    getId: (testCase) => testCase.id,
    getTaskPrefix: () => 'task-3-extraction',
};

/**
 * Match test case evaluator
 */
export const matchEvaluator: TestCaseEvaluator<MatchTestCase> = {
    type: 'match',
    
    async evaluate(testCase: MatchTestCase) {
        const startTime = Date.now();
        const request = await createNoteFromText(testCase.requestText, 'request');
        const offer = await createNoteFromText(testCase.offerText, 'offer');
        const result = matchEngine.calculateMatchScore(request, offer);
        const duration = Date.now() - startTime;
        
        const success = result.score >= testCase.expectedMinScore && 
                       (testCase.expectedMaxScore === undefined || result.score <= testCase.expectedMaxScore);
        
        const details = success 
            ? '' 
            : `Match score ${result.score.toFixed(2)} not in range [${testCase.expectedMinScore}, ${testCase.expectedMaxScore ?? 1.0}]`;
        
        return { success, details, duration };
    },
    
    getId: (testCase) => testCase.id,
    getTaskPrefix: () => 'task-2-match',
};

/**
 * Capture test case evaluator
 */
export const captureEvaluator: TestCaseEvaluator<CaptureTestCase> = {
    type: 'capture',
    
    async evaluate(testCase: CaptureTestCase) {
        const startTime = Date.now();
        const captureProps = await extractor.extractFromText(testCase.input);
        const duration = Date.now() - startTime;
        
        const success = captureProps.length >= testCase.expectedMinProperties && duration < testCase.maxDurationMs;
        
        const details = success 
            ? '' 
            : `Capture extracted ${captureProps.length} properties in ${duration}ms`;
        
        return { success, details, duration };
    },
    
    getId: (testCase) => testCase.id,
    getTaskPrefix: () => 'task-1-capture',
};

/**
 * Check property match (extracted from fastEvaluator)
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
 * Create a Note from text for testing
 */
export async function createNoteFromText(text: string, id: string = 'test'): Promise<Note> {
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