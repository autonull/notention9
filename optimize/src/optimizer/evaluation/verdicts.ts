import { computeRunVerdict, computeCaseVerdict, type RunVerdict, type VerdictConfig, type CaseVerdict, type PairedRunResult, pairedTTest, pairedConfidenceInterval, mean, std } from '@notention/core/eval/verdict';
import type { IntentEvaluationResult } from '../types/index.js';
import {
    DEFAULT_MDE_COMPLETION,
    DEFAULT_MIN_SAMPLE_SIZE,
} from '@notention/core/telemetry/constants';

/**
 * Common interface for result items that can be paired for verdict computation
 */
export interface VerdictResultItem {
    caseId: string;
    revisionId: string;
    repetition: number;
    metrics: Record<string, number>;
    output: unknown;
    success: boolean;
    error?: string;
}

/**
 * Check if an evaluation would be underpowered given the configuration
 * Returns null if powered, or an error message if underpowered
 */
export function checkEvaluationPower(
    config: VerdictConfig,
    caseCount: number,
    repetitions: number
): { powered: boolean; reason?: string; achievableMDE?: number } {
    const totalSamples = caseCount * repetitions;
    const minSampleSize = config.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
    const mde = config.mde[config.primaryMetric] ?? DEFAULT_MDE_COMPLETION;

    // Minimum sample size check
    if (totalSamples < minSampleSize) {
        return {
            powered: false,
            reason: `Underpowered: ${totalSamples} samples (${caseCount} cases × ${repetitions} reps) < minimum ${minSampleSize}`,
            achievableMDE: calculateAchievableMDE(totalSamples, mde),
        };
    }

    // Check if achievable MDE is reasonable (not larger than effect of interest)
    // With paired design, MDE scales with 1/sqrt(n)
    const achievableMDE = mde * Math.sqrt(minSampleSize / totalSamples);
    if (achievableMDE > mde * 2) { // If achievable MDE is more than 2x the target MDE
        return {
            powered: false,
            reason: `Underpowered: achievable MDE (${achievableMDE.toFixed(3)}) > 2× target MDE (${mde})`,
            achievableMDE,
        };
    }

    return { powered: true };
}

function calculateAchievableMDE(totalSamples: number, targetMDE: number): number {
    // Simplified: MDE scales with sqrt(minSampleSize / totalSamples)
    const minSampleSize = DEFAULT_MIN_SAMPLE_SIZE;
    return targetMDE * Math.sqrt(minSampleSize / Math.max(totalSamples, 1));
}

/**
 * Build paired run results from baseline and candidate result items
 */
export function buildPairedResults(
    baselineItems: VerdictResultItem[],
    candidateItems: VerdictResultItem[],
    config: VerdictConfig
): PairedRunResult[] {
    const baselineByCase = new Map<string, Map<number, VerdictResultItem>>();
    const candidateByCase = new Map<string, Map<number, VerdictResultItem>>();

    for (const r of baselineItems) {
        const caseMap = baselineByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        baselineByCase.set(r.caseId, caseMap);
    }

    for (const r of candidateItems) {
        const caseMap = candidateByCase.get(r.caseId) || new Map();
        caseMap.set(r.repetition, r);
        candidateByCase.set(r.caseId, caseMap);
    }

    const allCaseIds = new Set([...baselineByCase.keys(), ...candidateByCase.keys()]);
    const pairedResults: PairedRunResult[] = [];

    for (const caseId of allCaseIds) {
        const baselineCase = baselineByCase.get(caseId);
        const candidateCase = candidateByCase.get(caseId);

        if (!baselineCase || !candidateCase) {
            // Create an invalid paired result for missing case
            const paired: PairedRunResult = {
                caseId,
                baseline: createEmptyRunResult(caseId, 'baseline', config),
                candidate: createEmptyRunResult(caseId, 'candidate', config),
            };
            pairedResults.push(paired);
            continue;
        }

        const allReps = new Set([...baselineCase.keys(), ...candidateCase.keys()]);

        for (const rep of allReps) {
            const baseline = baselineCase.get(rep);
            const candidate = candidateCase.get(rep);
            if (!baseline || !candidate) continue;

            const paired: PairedRunResult = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: {
                    caseId,
                    revisionId: baseline.revisionId,
                    repetition: rep,
                    metrics: baseline.metrics,
                    output: baseline,
                    durationMs: 0,
                    success: baseline.success,
                    error: baseline.error,
                },
                candidate: {
                    caseId,
                    revisionId: candidate.revisionId,
                    repetition: rep,
                    metrics: candidate.metrics,
                    output: candidate,
                    durationMs: 0,
                    success: candidate.success,
                    error: candidate.error,
                },
            };
            pairedResults.push(paired);
        }
    }

    return pairedResults;
}

/**
 * Build paired results from intent evaluation results
 */
export function buildPairedResultsFromIntent(
    baselineResult: IntentEvaluationResult,
    candidateResult: IntentEvaluationResult,
    config: VerdictConfig
): PairedRunResult[] {
    const baselineByCase = new Map<string, VerdictResultItem[]>();
    const candidateByCase = new Map<string, VerdictResultItem[]>();

    for (const r of baselineResult.results) {
        const arr = baselineByCase.get(r.caseId) ?? [];
        arr.push({
            caseId: r.caseId,
            revisionId: baselineResult.revisionId,
            repetition: r.repetition,
            metrics: r.metrics as Record<string, number>,
            output: r,
            success: r.success,
            error: r.error,
        });
        baselineByCase.set(r.caseId, arr);
    }

    for (const r of candidateResult.results) {
        const arr = candidateByCase.get(r.caseId) ?? [];
        arr.push({
            caseId: r.caseId,
            revisionId: candidateResult.revisionId,
            repetition: r.repetition,
            metrics: r.metrics as Record<string, number>,
            output: r,
            success: r.success,
            error: r.error,
        });
        candidateByCase.set(r.caseId, arr);
    }

    const allCaseIds = new Set([...baselineByCase.keys(), ...candidateByCase.keys()]);
    const pairedResults: PairedRunResult[] = [];

    for (const caseId of allCaseIds) {
        const baselineCase = baselineByCase.get(caseId);
        const candidateCase = candidateByCase.get(caseId);

        if (!baselineCase || !candidateCase) {
            const paired: PairedRunResult = {
                caseId,
                baseline: createEmptyRunResult(caseId, baselineResult.revisionId, config),
                candidate: createEmptyRunResult(caseId, candidateResult.revisionId, config),
            };
            pairedResults.push(paired);
            continue;
        }

        const allReps = Math.max(baselineCase.length, candidateCase.length);

        for (let rep = 0; rep < allReps; rep++) {
            const baseline = baselineCase[rep];
            const candidate = candidateCase[rep];
            if (!baseline || !candidate) continue;

            const paired: PairedRunResult = {
                caseId: `${caseId}-rep-${rep}`,
                baseline: {
                    caseId,
                    revisionId: baseline.revisionId,
                    repetition: rep,
                    metrics: baseline.metrics,
                    output: baseline,
                    durationMs: 0,
                    success: baseline.success,
                    error: baseline.error,
                },
                candidate: {
                    caseId,
                    revisionId: candidate.revisionId,
                    repetition: rep,
                    metrics: candidate.metrics,
                    output: candidate,
                    durationMs: 0,
                    success: candidate.success,
                    error: candidate.error,
                },
            };
            pairedResults.push(paired);
        }
    }

    return pairedResults;
}

/**
 * Compute case verdicts from paired results
 */
export function computeCaseVerdictsFromPairedResults(
    pairedResults: PairedRunResult[],
    config: VerdictConfig
): CaseVerdict[] {
    const verdicts: CaseVerdict[] = [];
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
    caseVerdicts: CaseVerdict[],
    primaryMetric: string
): RunVerdict {
    return computeRunVerdict(runId, manifestHash, candidateId, baselineId, caseVerdicts, primaryMetric);
}

/**
 * Create an empty run result for missing baseline/candidate
 */
function createEmptyRunResult(caseId: string, revisionId: string, config: VerdictConfig): PairedRunResult['baseline'] {
    return {
        caseId,
        revisionId,
        repetition: 0,
        metrics: {},
        output: null,
        durationMs: 0,
        success: false,
        error: 'Missing baseline or candidate results',
    };
}

/**
 * Compute case verdicts from quality results (legacy wrapper)
 */
export function computeCaseVerdictsFromQualityResults(
    baselineResults: any[],
    candidateResults: any[],
    config: VerdictConfig
): CaseVerdict[] {
    const baselineItems: VerdictResultItem[] = baselineResults.map(r => ({
        caseId: r.caseId,
        revisionId: r.revisionId,
        repetition: r.repetition,
        metrics: r.metrics,
        output: r,
        success: r.success,
        error: r.error,
    }));
    const candidateItems: VerdictResultItem[] = candidateResults.map(r => ({
        caseId: r.caseId,
        revisionId: r.revisionId,
        repetition: r.repetition,
        metrics: r.metrics,
        output: r,
        success: r.success,
        error: r.error,
    }));

    const pairedResults = buildPairedResults(baselineItems, candidateItems, config);
    return computeCaseVerdictsFromPairedResults(pairedResults, config);
}

/**
 * Compute case verdicts from intent evaluation results (legacy wrapper)
 */
export function computeCaseVerdictsFromIntentResults(
    baselineResult: IntentEvaluationResult,
    candidateResult: IntentEvaluationResult,
    config: VerdictConfig
): CaseVerdict[] {
    const pairedResults = buildPairedResultsFromIntent(baselineResult, candidateResult, config);
    return computeCaseVerdictsFromPairedResults(pairedResults, config);
}