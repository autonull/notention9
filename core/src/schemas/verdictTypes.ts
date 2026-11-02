/**
 * Shared Verdict Types
 * Single source of truth for verdict type definitions
 * Used by both eval/ and schemas/ to break circular dependency
 */

export type MetricValue = number;

export interface RunResult {
    caseId: string;
    revisionId: string;
    repetition: number;
    metrics: Record<string, MetricValue>;
    output: unknown;
    durationMs: number;
    success: boolean;
    error?: string;
}

export interface PairedRunResult {
    caseId: string;
    baseline: RunResult;
    candidate: RunResult;
}

export interface MetricVerdict {
    metric: string;
    baselineMean: number;
    candidateMean: number;
    delta: number;
    deltaPercent: number;
    pValue: number;
    ci: [number, number];
    mde: number;
    passes: boolean;
    direction: 'improved' | 'degraded' | 'no-change';
}

export interface FloorCheck {
    name: string;
    value: number;
    floor: number;
    pass: boolean;
}

export interface CaseVerdict {
    caseId: string;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryMetric: MetricVerdict;
    otherMetrics: MetricVerdict[];
    floors: FloorCheck[];
    excluded: boolean;
    excludeReason?: string;
}

export interface RunVerdict {
    runId: string;
    manifestHash: string;
    revisionId: string;
    baselineRevisionId: string;
    caseVerdicts: CaseVerdict[];
    overallVerdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    summary: {
        improved: number;
        degraded: number;
        inconclusive: number;
        invalid: number;
        excluded: number;
    };
    primaryMetricAggregate: {
        metric: string;
        meanDelta: number;
        meanDeltaPercent: number;
        pValue: number;
        ci: [number, number];
    };
}

export interface VerdictConfig {
    primaryMetric: string;
    mde: Record<string, number>;
    floors: Record<string, number>;
    minSampleSize: number;
}

export interface VerdictEngineConfig extends VerdictConfig {
    // Engine-specific config
    [key: string]: unknown;
}