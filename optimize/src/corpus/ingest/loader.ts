import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ExtractionTestCase, MatchTestCase } from '../../shared/types/testCaseTypes.js';

/**
 * Load corpus test cases from output directory
 */
export async function loadCorpusTestCases(outputDir: string): Promise<{
    extraction: ExtractionTestCase[];
    match: MatchTestCase[];
}> {
    const extractionPath = join(outputDir, 'extraction-test-cases.json');
    const matchPath = join(outputDir, 'match-test-cases.json');

    let extraction: ExtractionTestCase[] = [];
    let match: MatchTestCase[] = [];

    try {
        const extContent = await readFile(extractionPath, 'utf-8');
        extraction = JSON.parse(extContent);
    } catch {
        // File might not exist
    }

    try {
        const matchContent = await readFile(matchPath, 'utf-8');
        match = JSON.parse(matchContent);
    } catch {
        // File might not exist
    }

    return { extraction, match };
}