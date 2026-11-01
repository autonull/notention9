/**
 * VerdictResult extended with evidenceClass + judgeProvenance (S6)
 * Tracks provenance of verdicts: measured > observed > hypothesized > asserted
 */

import { z } from 'zod';
import type { MetricVerdict, FloorCheck, CaseVerdict, RunVerdict } from '../eval/verdict.js';

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

// --- Extended MetricVerdict with evidence tracking ---

export interface ExtendedMetricVerdict extends MetricVerdict {
    evidenceClass: EvidenceClass;
    judgeProvenance: JudgeProvenance;
    rawData?: unknown;         // Raw measurements for audit
}

export const extendedMetricVerdictSchema = z.object({
    metric: z.string(),
    baselineMean: z.number(),
    candidateMean: z.number(),
    delta: z.number(),
    deltaPercent: z.number(),
    pValue: z.number(),
    ci: z.tuple([z.number(), z.number()]),
    mde: z.number(),
    passes: z.boolean(),
    direction: z.enum(['improved', 'degraded', 'no-change']),
    evidenceClass: evidenceClassSchema,
    judgeProvenance: judgeProvenanceSchema,
    rawData: z.unknown().optional(),
});

// --- Extended CaseVerdict with evidence tracking ---

export interface ExtendedCaseVerdict extends Omit<CaseVerdict, 'primaryMetric' | 'otherMetrics'> {
    primaryMetric: ExtendedMetricVerdict;
    otherMetrics: ExtendedMetricVerdict[];
    overallEvidenceClass: EvidenceClass;  // Highest class across all metrics
}

export const extendedCaseVerdictSchema = z.object({
    caseId: z.string(),
    verdict: z.enum(['improved', 'degraded', 'inconclusive', 'invalid']),
    primaryMetric: extendedMetricVerdictSchema,
    otherMetrics: z.array(extendedMetricVerdictSchema),
    floors: z.array(z.object({
        name: z.string(),
        value: z.number(),
        floor: z.number(),
        pass: z.boolean(),
    })),
    excluded: z.boolean(),
    excludeReason: z.string().optional(),
    overallEvidenceClass: evidenceClassSchema,
});

// --- Extended RunVerdict with evidence tracking ---

export interface ExtendedRunVerdict extends Omit<RunVerdict, 'caseVerdicts' | 'primaryMetricAggregate'> {
    caseVerdicts: ExtendedCaseVerdict[];
    primaryMetricAggregate: {
        metric: string;
        meanDelta: number;
        meanDeltaPercent: number;
        pValue: number;
        ci: [number, number];
        evidenceClass: EvidenceClass;
        judgeProvenance: JudgeProvenance;
    };
    governanceGatePassed: boolean;    // Only 'measured' can auto-activate
    governanceReason?: string;
}

export const extendedRunVerdictSchema = z.object({
    runId: z.string(),
    manifestHash: z.string(),
    revisionId: z.string(),
    baselineRevisionId: z.string(),
    caseVerdicts: z.array(extendedCaseVerdictSchema),
    overallVerdict: z.enum(['improved', 'degraded', 'inconclusive', 'invalid']),
    summary: z.object({
        improved: z.number(),
        degraded: z.number(),
        inconclusive: z.number(),
        invalid: z.number(),
        excluded: z.number(),
    }),
    primaryMetricAggregate: z.object({
        metric: z.string(),
        meanDelta: z.number(),
        meanDeltaPercent: z.number(),
        pValue: z.number(),
        ci: z.tuple([z.number(), z.number()]),
        evidenceClass: evidenceClassSchema,
        judgeProvenance: judgeProvenanceSchema,
    }),
    governanceGatePassed: z.boolean(),
    governanceReason: z.string().optional(),
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

// --- Conversion from base verdict to extended ---

export function extendMetricVerdict(
    base: MetricVerdict,
    evidenceClass: EvidenceClass = 'measured',
    provenance: JudgeProvenance
): ExtendedMetricVerdict {
    return {
        ...base,
        evidenceClass,
        judgeProvenance: provenance,
    };
}

export function extendCaseVerdict(
    base: CaseVerdict,
    evidenceClass: EvidenceClass = 'measured',
    provenance: JudgeProvenance
): ExtendedCaseVerdict {
    const primaryMetric = extendMetricVerdict(base.primaryMetric, evidenceClass, provenance);
    const otherMetrics = base.otherMetrics.map(m => extendMetricVerdict(m, evidenceClass, provenance));
    
    return {
        ...base,
        primaryMetric,
        otherMetrics,
        overallEvidenceClass: highestEvidenceClass([evidenceClass, ...otherMetrics.map(m => m.evidenceClass)]),
    };
}

export function extendRunVerdict(
    base: RunVerdict,
    evidenceClass: EvidenceClass = 'measured',
    provenance: JudgeProvenance,
    explicitConsent = false
): ExtendedRunVerdict {
    const caseVerdicts = base.caseVerdicts.map(cv => extendCaseVerdict(cv, evidenceClass, provenance));
    const overallClass = highestEvidenceClass(caseVerdicts.map(cv => cv.overallEvidenceClass));
    const gatePassed = passesGovernanceGate(overallClass, explicitConsent);
    
    return {
        ...base,
        caseVerdicts,
        primaryMetricAggregate: {
            ...base.primaryMetricAggregate,
            evidenceClass: overallClass,
            judgeProvenance: provenance,
        },
        governanceGatePassed: gatePassed,
        governanceReason: gatePassed ? undefined : `Evidence class '${overallClass}' requires explicit consent for activation`,
    };
}