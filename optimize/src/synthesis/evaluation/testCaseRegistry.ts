import {
    type ExtractionTestCase,
    type MatchTestCase,
    type CaptureTestCase,
} from './testCaseTypes.js';

// Static imports for core test data — fail loud if missing
import coreExtractionCases from './test-data/core-extraction.json' with { type: 'json' };
import coreMatchCases from './test-data/core-match.json' with { type: 'json' };
import coreCaptureCases from './test-data/core-capture.json' with { type: 'json' };

/**
 * Core extraction test cases (loaded from JSON via static import)
 * Fails loud at build time if file is missing or invalid.
 */
export const CORE_EXTRACTION_TEST_CASES: ExtractionTestCase[] = coreExtractionCases as ExtractionTestCase[];
if (CORE_EXTRACTION_TEST_CASES.length === 0) {
    throw new Error('CORE_EXTRACTION_TEST_CASES is empty — test data failed to load');
}

/**
 * Core match test cases (loaded from JSON via static import)
 * Fails loud at build time if file is missing or invalid.
 */
export const CORE_MATCH_TEST_CASES: MatchTestCase[] = coreMatchCases as MatchTestCase[];
if (CORE_MATCH_TEST_CASES.length === 0) {
    throw new Error('CORE_MATCH_TEST_CASES is empty — test data failed to load');
}

/**
 * Core capture test case (loaded from JSON via static import)
 * Fails loud at build time if file is missing or invalid.
 */
export const CORE_CAPTURE_TEST_CASE: CaptureTestCase = coreCaptureCases[0] as CaptureTestCase;
if (!CORE_CAPTURE_TEST_CASE) {
    throw new Error('CORE_CAPTURE_TEST_CASE is undefined — test data failed to load');
}

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
        this.extractionCases = CORE_EXTRACTION_TEST_CASES;
        this.matchCases = CORE_MATCH_TEST_CASES;
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