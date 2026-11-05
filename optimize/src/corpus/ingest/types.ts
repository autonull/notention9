import type { Property } from '@notention/core';

/**
 * Corpus configuration
 */
export interface CorpusConfig {
    inputDir: string;
    outputDir: string;
    fileExtensions: string[];
    minTermLength: number;
    maxTermsPerFile: number;
    generateTestCases: boolean;
    generateMatchCases: boolean;
}

/**
 * Corpus analysis result
 */
export interface CorpusAnalysis {
    totalFiles: number;
    totalTerms: number;
    terms: ExtractedTerm[];
    vocabulary: string[];
    generatedTestCases: ExtractionTestCase[];
    generatedMatchCases: MatchTestCase[];
    taxonomyGaps: string[];
}

/**
 * Extracted term from corpus
 */
export interface ExtractedTerm {
    term: string;
    frequency: number;
    files: string[];
    contexts: string[];
    category: string;
}

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