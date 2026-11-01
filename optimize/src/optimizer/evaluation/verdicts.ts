import { computeRunVerdict, computeCaseVerdict, type RunVerdict, type VerdictConfig } from '@notention/core/eval/verdict';
import type { IntentEvaluationResult } from '../types.js';

/**
 * Compute case verdicts from quality results
 * Adapted from eval/cli.ts
 */
export function computeCaseVerdictsFromQualityResults(
    baselineResults: any[],
    candidateResults: any[],
    config: VerdictConfig
) {
    const baselineByCase = new Map<string, Map<number, any>>();
    const candidateByCase = new Map<string, Map<number, any>>();

    for (const r of baselineResults) {
        const caseMap = baselineByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        baselineByCase.set(r.caseId, caseMap);
    }

    for (const r of candidateResults) {
        const caseMap = candidateByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        candidateByCase.set(r.caseId, caseMap);
    }

    const allCaseIds = new Set([...baselineByCase.keys(), ...candidateByCase.keys()]);
    const pairedResults: any[] = [];

    for (const caseId of allCaseIds) {
        const baselineCase = baselineByCase.get(caseId);
        const candidateCase = candidateByCase.get(caseId);

        if (!baselineCase || !candidateCase) {
            pairedResults.push({
                caseId,
                verdict: 'invalid',
                primaryMetric: { metric: config.primaryMetric, baselineMean: 0, candidateMean: 0, delta: 0, deltaPercent: 0, pValue: 1, ci: [0, 0], mde: config.mde[config.primaryMetric] ?? 0, passes: false, direction: 'no-change' },
                otherMetrics: [], floors: [], excluded: true, excludeReason: 'Missing baseline or candidate results',
            });
            continue;
        }

        const allReps = new Set([...baselineCase.keys(), ...candidateCase.keys()]);

        for (const rep of allReps) {
            const baseline = baselineCase.get(rep);
            const candidate = candidateCase.get(rep);
            if (!baseline || !candidate) continue;

            const paired: any = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: { caseId, revisionId: baseline.revisionId, repetition: rep, metrics: baseline.metrics, output: baseline, durationMs: 0, success: baseline.success, error: baseline.error },
                candidate: { caseId, revisionId: candidate.revisionId, repetition: rep, metrics: candidate.metrics, output: candidate, durationMs: 0, success: candidate.success, error: candidate.error },
            };
            pairedResults.push(paired);
        }
    }

    const verdicts = [];
    for (const paired of pairedResults) {
        const verdict = computeCaseVerdict(paired.caseId, paired, config);
        verdicts.push(verdict);
    }

    return verdicts;
}

/**
 * Compute case verdicts from intent evaluation results
 * Uses completion metric as primary for intent cases
 */
export function computeCaseVerdictsFromIntentResults(
    baselineResult: IntentEvaluationResult,
    candidateResult: IntentEvaluationResult,
    config: VerdictConfig
) {
    const baselineByCase = new Map<string, any[]>();
    const candidateByCase = new Map<string, any[]>();

    for (const r of baselineResult.results) {
        const arr = baselineByCase.get(r.caseId) ?? [];
        arr.push(r);
        baselineByCase.set(r.caseId, arr);
    }

    for (const r of candidateResult.results) {
        const arr = candidateByCase.get(r.caseId) ?? [];
        arr.push(r);
        candidateByCase.set(r.caseId, arr);
    }

    const allCaseIds = new Set([...baselineByCase.keys(), ...candidateByCase.keys()]);
    const pairedResults: any[] = [];

    for (const caseId of allCaseIds) {
        const baselineCase = baselineByCase.get(caseId);
        const candidateCase = candidateByCase.get(caseId);

        if (!baselineCase || !candidateCase) {
            pairedResults.push({
                caseId,
                verdict: 'invalid',
                primaryMetric: { metric: config.primaryMetric, baselineMean: 0, candidateMean: 0, delta: 0, deltaPercent: 0, pValue: 1, ci: [0, 0], mde: config.mde[config.primaryMetric] ?? 0, passes: false, direction: 'no-change' },
                otherMetrics: [], floors: [], excluded: true, excludeReason: 'Missing baseline or candidate results',
            });
            continue;
        }

        const allReps = Math.max(baselineCase.length, candidateCase.length);

        for (let rep = 0; rep < allReps; rep++) {
            const baseline = baselineCase[rep];
            const candidate = candidateCase[rep];
            if (!baseline || !candidate) continue;

            const paired: any = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: { caseId, revisionId: baselineResult.revisionId, repetition: rep, metrics: baseline.metrics, output: baseline, durationMs: 0, success: baseline.success, error: baseline.error },
                candidate: { caseId, revisionId: candidateResult.revisionId, repetition: rep, metrics: candidate.metrics, output: candidate, durationMs: 0, success: candidate.success, error: candidate.error },
            };
            pairedResults.push(paired);
        }
    }

    const verdicts = [];
    for (const paired of pairedResults) {
        const verdict = computeCaseVerdict(paired.caseId, paired, config);
        verdicts.push(verdict);
    }

    return verdicts;
}

/**
 * Create a run verdict from paired case verdicts
 */
export function createRunVerdict(
    runId: string,
    manifestHash: string,
    candidateId: string,
    baselineId: string,
    caseVerdicts: any[],
    primaryMetric: string
): RunVerdict {
    return computeRunVerdict(runId, manifestHash, candidateId, baselineId, caseVerdicts, primaryMetric);
}