/**
 * Quality Runner — In-process, deterministic quality evaluation
 * Runs extraction and matching quality cases against core engines
 */

import { readQualityCases, type QualityCase, type ExtractionExpectation, type MatchExpectation } from './caseManifest.js';
import { evaluateExtraction, evaluateMatch } from './verdict.js';

// Type for the extraction engine (to be implemented by consumer)
interface ExtractionEngine {
    extract(input: string): Promise<Record<string, string[]>>;
}

// Type for the match engine (to be implemented by consumer)
interface MatchEngine {
    match(query: string, notes: any[]): Promise<Array<{ noteId: string; score: number }>>;
}

export interface QualityRunConfig {
    extractionEngine?: ExtractionEngine;
    matchEngine?: MatchEngine;
    notes?: any[];             // For match evaluation
    repetitions?: number;      // Default 1
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

export async function runQualityCase(
    caseData: QualityCase,
    config: QualityRunConfig
): Promise<QualityCaseResult> {
    try {
        if (caseData.qualityFamily === 'extraction') {
            return await runExtractionCase(caseData, config);
        } else {
            return await runMatchCase(caseData, config);
        }
    } catch (e) {
        return {
            caseId: caseData.id,
            qualityFamily: caseData.qualityFamily,
            repetition: 0,
            metrics: {},
            details: [`Error: ${e instanceof Error ? e.message : String(e)}`],
            success: false,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

async function runExtractionCase(
    caseData: QualityCase,
    config: QualityRunConfig
): Promise<QualityCaseResult> {
    const { extractionEngine } = config;
    
    if (!extractionEngine) {
        throw new Error('ExtractionEngine required for extraction quality cases');
    }
    
    const extracted = await extractionEngine.extract(caseData.input);
    const { precision, recall, f1, details } = evaluateExtraction(
        caseData.input,
        caseData.expected as ExtractionExpectation[],
        caseData.forbidden as ExtractionExpectation[],
        extracted
    );
    
    return {
        caseId: caseData.id,
        qualityFamily: 'extraction',
        repetition: 0,
        metrics: { precision, recall, f1 },
        details,
        success: true,
    };
}

async function runMatchCase(
    caseData: QualityCase,
    config: QualityRunConfig
): Promise<QualityCaseResult> {
    const { matchEngine, notes } = config;
    
    if (!matchEngine || !notes) {
        throw new Error('MatchEngine and notes required for match quality cases');
    }
    
    if (caseData.qualityFamily !== 'match') {
        throw new Error('Invalid case family for match evaluation');
    }
    
    const actualMatches = await matchEngine.match(caseData.input, notes);
    const { precision, recall, f1, details } = evaluateMatch(
        caseData.expected as MatchExpectation[],
        actualMatches
    );
    
    return {
        caseId: caseData.id,
        qualityFamily: 'match',
        repetition: 0,
        metrics: { precision, recall, f1 },
        details,
        success: true,
    };
}

export async function runQualitySuite(
    qualityFamily: 'extraction' | 'match',
    config: QualityRunConfig
): Promise<QualityCaseResult[]> {
    const cases = readQualityCases(qualityFamily);
    const results: QualityCaseResult[] = [];
    
    const repetitions = config.repetitions ?? 1;
    
    for (const caseData of cases) {
        for (let rep = 0; rep < repetitions; rep++) {
            const result = await runQualityCase(caseData, config);
            results.push({ ...result, repetition: rep });
        }
    }
    
    return results;
}

export async function runAllQuality(config: QualityRunConfig): Promise<QualityCaseResult[]> {
    const extractionResults = await runQualitySuite('extraction', config);
    const matchResults = await runQualitySuite('match', config);
    return [...extractionResults, ...matchResults];
}