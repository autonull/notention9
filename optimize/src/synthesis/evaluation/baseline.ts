import type { BaselineResult } from './types.js';
import type { TestCaseEvaluator } from './evaluators.js';
import type { ExtractionTestCase, MatchTestCase, CaptureTestCase } from './testCaseTypes.js';
import { prepareEvaluationTestCases } from './corpusLoader.js';
import { getDefaultDependencies } from './dependencies.js';

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

/**
 * Fast baseline evaluation - runs all core test cases
 */
export async function runFastBaselineEvaluation(): Promise<BaselineResult[]> {
    const results: BaselineResult[] = [];

    // Prepare test cases (loads corpus, registers, builds with flags)
    const { extractionCases, matchCases, captureCase } = await prepareEvaluationTestCases();

    // Get default dependencies
    const deps = getDefaultDependencies();

    // Evaluate extraction test cases (core + corpus)
    results.push(...await runTestCases(extractionCases, deps.extractionEvaluator));

    // Evaluate match test cases (core + corpus)
    results.push(...await runTestCases(matchCases, deps.matchEvaluator));

    // Test capture task (uses extraction)
    const captureResult = await createBaselineResultAsync(
        captureCase,
        deps.captureEvaluator,
        false,
        'task-1-capture'
    );
    results.unshift(captureResult);

    return results;
}