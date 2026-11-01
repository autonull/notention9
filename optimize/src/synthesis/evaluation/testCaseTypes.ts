import type { Property, Note } from '@notention/core';
import type { ExtractionTestCase, MatchTestCase } from '../../shared/types/testCaseTypes.js';

/**
 * Re-export shared test case types
 */
export type { ExtractionTestCase, MatchTestCase };

/**
 * Capture test case - tests the capture task (uses extraction)
 * Specific to synthesis/evaluation module
 */
export interface CaptureTestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    maxDurationMs: number;
}

export type TestCase = ExtractionTestCase;