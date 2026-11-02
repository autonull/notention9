/**
 * Evidence Class Definitions (S6)
 * Single source of truth for evidence class hierarchy and provenance tracking
 */

import { z } from 'zod';

// --- Evidence Class ---

export const EVIDENCE_CLASSES = [
    'measured',     // Empirical: controlled experiment, statistical test
    'observed',     // Human-verified: expert review, audit, human judge
    'hypothesized', // LLM-judged: model prediction, proxy metric, LLM-as-judge
    'asserted',     // Declared: assumption, design intent, config default
] as const;

export type EvidenceClass = typeof EVIDENCE_CLASSES[number];

export const evidenceClassSchema = z.enum(EVIDENCE_CLASSES);

// --- Judge Provenance ---

export interface JudgeProvenance {
    judgeId: string;           // 'human:alice', 'model:gpt-4o', 'mcnemar:v1', 'bayesian:v2'
    judgeType: 'human' | 'model' | 'statistical';
    timestamp: string;         // ISO timestamp
    confidence?: number;       // 0-1 confidence score
    metadata?: Record<string, unknown>;
}

export const judgeProvenanceSchema = z.object({
    judgeId: z.string(),
    judgeType: z.enum(['human', 'model', 'statistical']),
    timestamp: z.string().datetime(),
    confidence: z.number().min(0).max(1).optional(),
    metadata: z.record(z.unknown()).optional(),
});

// --- Evidence class hierarchy ---

export const EVIDENCE_CLASS_RANK: Record<EvidenceClass, number> = {
    measured: 4,
    observed: 3,
    hypothesized: 2,
    asserted: 1,
};

/**
 * Get the highest (strongest) evidence class from a list
 */
export function highestEvidenceClass(classes: EvidenceClass[]): EvidenceClass {
    return classes.reduce((highest, current) => 
        EVIDENCE_CLASS_RANK[current] > EVIDENCE_CLASS_RANK[highest] ? current : highest
    , 'asserted');
}

/**
 * Check if evidence class meets governance gate
 * Only 'measured' can auto-activate; others require explicit consent
 */
export function passesGovernanceGate(evidenceClass: EvidenceClass, explicitConsent = false): boolean {
    if (evidenceClass === 'measured') return true;
    return explicitConsent;
}

/**
 * Create judge provenance for statistical verdict
 */
export function createStatisticalProvenance(
    testName: string,
    version: string,
    confidence?: number,
    metadata?: Record<string, unknown>
): JudgeProvenance {
    return {
        judgeId: `${testName}:${version}`,
        judgeType: 'statistical',
        timestamp: new Date().toISOString(),
        confidence,
        metadata,
    };
}

/**
 * Create judge provenance for human judge
 */
export function createHumanProvenance(
    userId: string,
    confidence?: number,
    metadata?: Record<string, unknown>
): JudgeProvenance {
    return {
        judgeId: `human:${userId}`,
        judgeType: 'human',
        timestamp: new Date().toISOString(),
        confidence,
        metadata,
    };
}

/**
 * Create judge provenance for LLM judge
 */
export function createModelProvenance(
    modelId: string,
    confidence?: number,
    metadata?: Record<string, unknown>
): JudgeProvenance {
    return {
        judgeId: `model:${modelId}`,
        judgeType: 'model',
        timestamp: new Date().toISOString(),
        confidence,
        metadata,
    };
}

/**
 * Create judge provenance for asserted (default) verdict
 */
export function createAssertedProvenance(
    source: string,
    metadata?: Record<string, unknown>
): JudgeProvenance {
    return {
        judgeId: `asserted:${source}`,
        judgeType: 'human', // Assertions are human-declared
        timestamp: new Date().toISOString(),
        confidence: 0, // Asserted has no statistical confidence
        metadata: { source, ...metadata },
    };
}