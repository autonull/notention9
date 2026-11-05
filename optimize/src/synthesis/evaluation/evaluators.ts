import type { Property, Note } from '@notention/core';
import type { ExtractionTestCase, MatchTestCase, CaptureTestCase } from './testCaseTypes.js';

/**
 * Evaluation result for a single test case
 */
export interface EvaluationResult {
    success: boolean;
    details: string;
    duration: number;
}

/**
 * Base evaluator interface
 */
export interface TestCaseEvaluator<TTestCase extends { id: string }> {
    readonly type: string;
    evaluate(testCase: TTestCase): Promise<EvaluationResult>;
    getId(testCase: TTestCase): string;
    getTaskPrefix(): string;
}

/**
 * Abstract base class for test case evaluators
 */
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