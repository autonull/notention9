import type { CandidateStrategy, CandidateDir } from '../StrategySpec.js';
import type { BaselineResult, CandidateEvaluation, EvaluationReport } from './types.js';
import { runFastBaselineEvaluation, loadOrRunFastBaseline } from './baseline.js';
import { getDefaultDependencies } from './dependencies.js';

/**
 * Evaluate a candidate against baseline
 * For now, candidates don't change the core logic, so they get the same results as baseline
 * In the future, candidates could provide custom extractors/matchers
 */
export async function evaluateCandidateFast(
    candidate: CandidateStrategy,
    baseline: BaselineResult[]
): Promise<CandidateEvaluation> {
    const taskResults = new Map<string, BaselineResult>();
    let totalSuccessRate = 0;
    let totalDuration = 0;
    let coreTestCount = 0;

    for (const baselineResult of baseline) {
        // Candidate inherits baseline behavior (no custom logic yet)
        taskResults.set(baselineResult.taskId, { ...baselineResult });

        // Only count non-corpus tests for must-win gate
        if (!baselineResult.isCorpusTest) {
            totalSuccessRate += baselineResult.successRate;
            totalDuration += baselineResult.medianDuration;
            coreTestCount++;
        }
    }

    const overallSuccessRate = coreTestCount > 0 ? totalSuccessRate / coreTestCount : 0;
    const overallMedianDuration = coreTestCount > 0 ? totalDuration / coreTestCount : 0;

    // Must-win: candidate must beat baseline on overall success rate (core tests only)
    const coreBaseline = baseline.filter(b => !b.isCorpusTest);
    const baselineOverall = coreBaseline.reduce((sum, b) => sum + b.successRate, 0) / (coreBaseline.length || 1);
    const passed = overallSuccessRate >= baselineOverall;

    return {
        candidateId: candidate.id,
        taskResults,
        overallSuccessRate,
        overallMedianDuration,
        passed,
        resourceMetrics: {
            totalLatencyMs: 0,
            avgInferenceLatencyMs: 0,
            peakMemoryMB: 0,
            modelSizeMB: 0,
            inferenceCount: 0,
            tokensUsed: 0,
        },
    };
}

/**
 * Full fast evaluation of all candidates
 */
export async function runFastEvaluation(
    candidatesDir: CandidateDir,
    baseline: BaselineResult[]
): Promise<EvaluationReport> {
    const results: CandidateEvaluation[] = [];

    for (const candidate of candidatesDir.candidates.values()) {
        const evaluation = await evaluateCandidateFast(candidate, baseline);
        results.push(evaluation);
    }

    return {
        baseline,
        candidates: results,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Load or run baseline with persistence
 */
export async function loadOrRunFastBaseline(
    baselinePath: string
): Promise<BaselineResult[]> {
    try {
        const content = await import('fs/promises').then(m => m.readFile(baselinePath, 'utf-8'));
        return JSON.parse(content);
    } catch {
        // File doesn't exist or can't be read
    }

    const baseline = await runFastBaselineEvaluation();
    await import('fs/promises').then(m => m.mkdir(import('path').then(p => p.dirname(baselinePath)), { recursive: true }));
    await import('fs/promises').then(m => m.writeFile(baselinePath, JSON.stringify(baseline, null, 2)));

    return baseline;
}