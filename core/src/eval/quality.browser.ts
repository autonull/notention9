/**
 * Browser-safe stub for quality
 * Quality evaluation is Node.js only
 */

export interface ExtractionEngine {
    extract(input: string): Promise<Record<string, string[]>>;
}

export interface MatchEngine {
    match(query: string, notes: any[]): Promise<Array<{ noteId: string; score: number }>>;
}

export interface QualityRunConfig {
    extractionEngine?: ExtractionEngine;
    matchEngine?: MatchEngine;
    notes?: any[];
    repetitions?: number;
}

export interface QualityCaseResult {
    caseId: string;
    qualityFamily: 'extraction' | 'match';
    repetition: number;
    metrics: {
        precision?: number;
        recall?: number;
        f1?: number;
    };
    details: string[];
    success: boolean;
    error?: string;
}

export async function runQualityCase(): Promise<never> {
    throw new Error('runQualityCase is only available in Node.js');
}

export async function runQualitySuite(): Promise<never> {
    throw new Error('runQualitySuite is only available in Node.js');
}

export async function runAllQuality(): Promise<never> {
    throw new Error('runAllQuality is only available in Node.js');
}

// Types
export type { QualityCase, ExtractionExpectation, MatchExpectation } from './caseManifest.js';