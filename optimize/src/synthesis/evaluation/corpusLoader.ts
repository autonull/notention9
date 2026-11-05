import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadCorpusTestCases } from '../../corpus/index.js';
import { CORPUS_OUTPUT_DIRS } from '../../constants.js';
import type { ExtractionTestCase, MatchTestCase } from './testCaseTypes.js';
import { testCaseRegistry } from './testCaseRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    captureCase: import('./testCaseTypes.js').CaptureTestCase;
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

    // Import capture case from test data
    const { CORE_CAPTURE_TEST_CASE } = await import('./testCaseRegistry.js');

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