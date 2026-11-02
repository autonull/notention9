/**
 * VerdictResult extended with evidenceClass + judgeProvenance (S6)
 * Tracks provenance of verdicts: measured > observed > hypothesized > asserted
 */

import { z } from 'zod';
import type { MetricVerdict, FloorCheck, CaseVerdict, RunVerdict } from './verdictTypes.js';
import { 
    EVIDENCE_CLASSES, 
    type EvidenceClass, 
    evidenceClassSchema,
    type JudgeProvenance,
    judgeProvenanceSchema,
    EVIDENCE_CLASS_RANK,
    highestEvidenceClass,
    passesGovernanceGate,
    createStatisticalProvenance,
    createHumanProvenance,
    createModelProvenance,
    createAssertedProvenance,
} from './evidence.js';

// Re-export evidence types
export { 
    EVIDENCE_CLASSES, 
    type EvidenceClass, 
    evidenceClassSchema,
    type JudgeProvenance,
    judgeProvenanceSchema,
    EVIDENCE_CLASS_RANK,
    highestEvidenceClass,
    passesGovernanceGate,
    createStatisticalProvenance,
    createHumanProvenance,
    createModelProvenance,
    createAssertedProvenance,
} from './evidence.js';

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