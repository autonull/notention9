/**
 * Shared test case types - used by both synthesis/evaluation and corpus modules
 * Breaks circular dependency between corpus/ingest.ts and synthesis/evaluation
 */
import type { Property } from '@notention/core';

/**
 * Test case for extraction evaluation
 */
export interface ExtractionTestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    expectedProperties?: Partial<Property>[];
}

/**
 * Test case for match evaluation
 */
export interface MatchTestCase {
    id: string;
    name: string;
    requestText: string;
    offerText: string;
    expectedMinScore: number;
    expectedMaxScore?: number;
}

/**
 * Capture test case - tests the capture task (uses extraction)
 */
export interface CaptureTestCase {
    id: string;
    name: string;
    input: string;
    expectedMinProperties: number;
    maxDurationMs: number;
}