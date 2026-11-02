/**
 * CaseManifest schema + CaseStore interface (S4)
 * Replaces hardcoded filesystem case manifest with pluggable storage
 */

import { z } from 'zod';
import type { 
    CaseFamily, 
    CaseSplit, 
    QualityFamily, 
    IntentCase, 
    QualityCase, 
    ExtractionExpectation, 
    MatchExpectation,
    CaseManifest,
    CaseEntry
} from './caseTypes.js';

// Re-export implementations from eval/caseStore
export { FileSystemCaseStore } from '../eval/caseStore/fileSystem.js';
export { InMemoryCaseStore } from '../eval/caseStore/inMemory.js';

// --- Zod schemas for case types ---

export const extractionExpectationSchema = z.object({
    key: z.string(),
    operator: z.enum(['equals', 'contains', 'less than', 'greater than', 'matches']),
    values: z.array(z.string()),
});

export const matchExpectationSchema = z.object({
    noteId: z.string(),
    minScore: z.number().optional(),
});

export const intentCaseSchema = z.object({
    id: z.string(),
    family: z.literal('intent'),
    intent: z.string(),
    prompt: z.string(),
    seed: z.object({
        notes: z.array(z.unknown()),
        settings: z.record(z.unknown()),
        revisions: z.array(z.string()),
    }),
    expected: z.object({
        minProperties: z.number().optional(),
        requiredKeys: z.array(z.string()).optional(),
        outcome: z.enum(['captured', 'elicited', 'matched', 'rendered']),
        matchMinRecall: z.number().optional(),
        matchMinPrecision: z.number().optional(),
    }),
    metrics: z.array(z.enum(['completion', 'steps', 'corrections', 'recall', 'precision', 'f1'])),
    tags: z.array(z.string()),
    provenance: z.object({
        author: z.enum(['human', 'model']),
        source: z.string(),
    }),
});

export const qualityCaseSchema = z.object({
    id: z.string(),
    family: z.literal('quality'),
    qualityFamily: z.enum(['extraction', 'match']),
    input: z.string(),
    expected: z.union([
        z.array(extractionExpectationSchema),
        z.array(matchExpectationSchema),
    ]),
    forbidden: z.array(extractionExpectationSchema).optional(),
    labels: z.object({
        annotators: z.number(),
        agreement: z.number(),
    }).optional(),
    tags: z.array(z.string()),
});

export const caseEntrySchema = z.object({
    id: z.string(),
    family: z.enum(['intent', 'quality']),
    split: z.enum(['search', 'validation', 'holdout']).optional(),
    qualityFamily: z.enum(['extraction', 'match']).optional(),
    path: z.string(),
    hash: z.string(),
    tags: z.array(z.string()),
});

export const caseManifestSchema = z.object({
    version: z.literal(1),
    hash: z.string(),
    generatedAt: z.string().datetime(),
    counts: z.object({
        intent: z.object({
            search: z.number(),
            validation: z.number(),
            holdout: z.number(),
        }),
        quality: z.object({
            extraction: z.number(),
            match: z.number(),
        }),
    }),
    cases: z.array(caseEntrySchema),
});

// Re-export types from caseTypes (single source of truth)
export type { 
    CaseFamily, 
    CaseSplit, 
    QualityFamily, 
    IntentCase, 
    QualityCase, 
    ExtractionExpectation, 
    MatchExpectation,
    CaseManifest,
    CaseEntry
} from './caseTypes.js';

export interface CaseStore {
    /** Initialize the store */
    init(): Promise<void>;
    
    /** Read the manifest */
    readManifest(): Promise<CaseManifest>;
    
    /** Write the manifest */
    writeManifest(manifest: CaseManifest): Promise<void>;
    
    /** Read intent cases for a split */
    readIntentCases(split: CaseSplit): Promise<IntentCase[]>;
    
    /** Read quality cases for a family */
    readQualityCases(qualityFamily: QualityFamily): Promise<QualityCase[]>;
    
    /** Read holdout cases (audit-only) */
    readHoldoutCases(): Promise<IntentCase[]>;
    
    /** Read all cases */
    readAllCases(): Promise<{ intent: IntentCase[]; quality: QualityCase[] }>;
    
    /** Add or update a case */
    upsertCase(caseData: IntentCase | QualityCase): Promise<void>;
    
    /** Delete a case */
    deleteCase(id: string): Promise<boolean>;
    
    /** Verify integrity of all cases */
    verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }>;
    
    /** Close the store */
    close(): Promise<void>;
}