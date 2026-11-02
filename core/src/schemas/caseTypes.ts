/**
 * Shared Case Types
 * Single source of truth for case type definitions
 * Used by both eval/ and schemas/ to break circular dependency
 */

export type CaseFamily = 'intent' | 'quality';
export type CaseSplit = 'search' | 'validation' | 'holdout';
export type QualityFamily = 'extraction' | 'match';

export interface CaseManifest {
    version: 1;
    hash: string;
    generatedAt: string;
    counts: {
        intent: { search: number; validation: number; holdout: number };
        quality: { extraction: number; match: number };
    };
    cases: CaseEntry[];
}

export interface CaseEntry {
    id: string;
    family: CaseFamily;
    split?: CaseSplit;
    qualityFamily?: QualityFamily;
    path: string;
    hash: string;
    tags: string[];
}

export interface IntentCase {
    id: string;
    family: 'intent';
    intent: string;
    prompt: string;
    seed: {
        notes: any[];
        settings: Record<string, any>;
        revisions: string[];
    };
    expected: {
        minProperties?: number;
        requiredKeys?: string[];
        outcome: 'captured' | 'elicited' | 'matched' | 'rendered';
        matchMinRecall?: number;
        matchMinPrecision?: number;
    };
    metrics: ('completion' | 'steps' | 'corrections' | 'recall' | 'precision' | 'f1')[];
    tags: string[];
    provenance: {
        author: 'human' | 'model';
        source: string;
    };
}

export interface QualityCase {
    id: string;
    family: 'quality';
    qualityFamily: QualityFamily;
    input: string;
    expected: ExtractionExpectation[] | MatchExpectation[];
    forbidden?: ExtractionExpectation[];
    labels?: {
        annotators: number;
        agreement: number;
    };
    tags: string[];
}

export type ExtractionExpectation = {
    key: string;
    operator: 'equals' | 'contains' | 'less than' | 'greater than' | 'matches';
    values: string[];
};

export type MatchExpectation = {
    noteId: string;
    minScore?: number;
};