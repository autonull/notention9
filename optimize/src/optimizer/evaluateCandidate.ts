import type { OptimizerCandidate, CandidateEvaluation, IntentEvaluationConfig, VerdictConfig } from './types/index.js';
import { runIntentEvaluationForRevision } from './evaluation/intentEvaluation.js';
import { computeCaseVerdictsFromIntentResults, createRunVerdict } from './evaluation/verdicts.js';
import { getCandidateCache, type CandidateCache } from './cache/index.js';
import { readIntentCases } from '@notention/core/eval/caseManifest';

export async function evaluateSingleCandidate(
    candidate: OptimizerCandidate,
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>,
    intentCaseIds: string[],
    verdictConfig: VerdictConfig,
    candidateCache: CandidateCache,
    fullEvaluation = false
): Promise<CandidateEvaluation> {

    // Check cache first
    const cachedEvaluation = candidateCache.get(candidate.seamRole, candidate.strategyId, candidate.patch);
    if (cachedEvaluation) {
        console.log(`     → Cache hit`);
        return cachedEvaluation;
    }

    // Determine evaluation intensity based on phase
    const repetitions = fullEvaluation ? 3 : 1;
    const caseFilter = fullEvaluation ? intentCaseIds : intentCaseIds.slice(0, Math.max(1, Math.floor(intentCaseIds.length * 0.25)));

    // Run intent evaluation for candidate (UI params affect capture/match behavior)
    // Note: Quality evaluation is NOT run per-candidate because strategy params are UI-only
    // and don't affect core extraction/matching quality. Baseline quality is run once.
    console.log(`     🌐 Running intent evaluation (${caseFilter.length} cases × ${repetitions} reps)...`);
    const candidateIntentResult = await runIntentEvaluationForRevision(candidate.id, {
        split: 'validation',
        repetitions,
        headless: true,
        caseFilter,
        revisionPatch: candidate.patch,
    });

    // Compute verdict based on intent results (primary: completion)
    const caseVerdicts = computeCaseVerdictsFromIntentResults(
        baselineIntentResult,
        candidateIntentResult,
        verdictConfig
    );

    const runVerdict = createRunVerdict(
        `opt-${candidate.id}`,
        baselineIntentResult.manifestHash,
        candidate.id,
        'baseline',
        caseVerdicts,
        'completion'
    );

    const evaluation: CandidateEvaluation = {
        candidateId: candidate.id,
        revisionId: candidate.id,
        qualityResults: null, // Not evaluated per-candidate (UI params don't affect core quality)
        verdict: runVerdict.overallVerdict,
        primaryDelta: runVerdict.primaryMetricAggregate.meanDelta,
        cost: {
            browserRuns: candidateIntentResult.results.length,
            tokensUsed: 0,
            durationMs: 0,
        },
    };

    // Cache the evaluation
    candidateCache.set(candidate.seamRole, candidate.strategyId, candidate.patch, evaluation);

    return evaluation;
}

export async function runBaselineEvaluations(config: import('./types/index.js').OptimizerConfig): Promise<{
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>;
    intentCaseIds: string[];
}> {
    console.log('\n📏 Running baseline intent evaluation (validation split)...');
    const intentCases = readIntentCases('validation'); // Use validation (10 cases)
    const maxIntentCases = config.maxIntentCases ?? 10;
    const intentCaseIds = intentCases.slice(0, maxIntentCases).map(c => c.id);
    const baselineIntentConfig: IntentEvaluationConfig = {
        split: 'validation',
        repetitions: 3, // Match full evaluation for powered comparison
        headless: true,
        caseFilter: intentCaseIds,
        revisionPatch: {},
    };
    const baselineIntentResult = await runIntentEvaluationForRevision('incumbent', baselineIntentConfig);

    return { baselineIntentResult, intentCaseIds };
}