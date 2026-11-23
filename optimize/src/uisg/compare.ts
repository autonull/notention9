import type { EvidenceBundle } from '../evidence.js';

export interface BundleSummary {
    journeyId: string;
    runId: string;
    status: EvidenceBundle['status'];
    steps: number;
    durationMs: number;
    failedAssertions: string[];
}

export interface BundleComparison {
    a: BundleSummary;
    b: BundleSummary;
    durationDeltaMs: number;
    kindMismatch: boolean;
    stepDeltas: Array<{ index: number; kindA?: string; kindB?: string; deltaMs: number }>;
}

const summarize = (bundle: EvidenceBundle): BundleSummary => ({
    journeyId: bundle.journeyId,
    runId: bundle.runId,
    status: bundle.status,
    steps: bundle.steps.length,
    durationMs: bundle.steps.reduce((total, { durationMs }) => total + durationMs, 0),
    failedAssertions: bundle.assertions.filter(({ ok }) => !ok).map(({ id }) => id),
});

export function compareBundles(a: EvidenceBundle, b: EvidenceBundle): BundleComparison {
    const length = Math.max(a.steps.length, b.steps.length);
    const stepDeltas = Array.from({ length }, (_, index) => {
        const left = a.steps[index];
        const right = b.steps[index];
        return {
            index,
            kindA: left?.kind,
            kindB: right?.kind,
            deltaMs: (right?.durationMs ?? 0) - (left?.durationMs ?? 0),
        };
    });
    return {
        a: summarize(a),
        b: summarize(b),
        durationDeltaMs: summarize(b).durationMs - summarize(a).durationMs,
        kindMismatch: stepDeltas.some(({ kindA, kindB }) => kindA !== kindB),
        stepDeltas,
    };
}
