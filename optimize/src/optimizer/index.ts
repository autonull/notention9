import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { logEvent } from '@notention/core/telemetry/ledger';
import { readManifest, readIntentCases } from '@notention/core/eval/caseManifest';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    type OptimizerConfig,
    type OptimizerCandidate,
    type OptimizerResult,
    type CandidateEvaluation,
    type IntentEvaluationConfig,
    type VerdictConfig,
    defaultOptimizerConfig,
} from './types/index.js';
import { runIntentEvaluationForRevision, cleanupPreviewServer } from './evaluation/intentEvaluation.js';
import {
    computeCaseVerdictsFromIntentResults,
    createRunVerdict,
} from './evaluation/verdicts.js';
import { getCandidateCache } from './cache/index.js';
import { enumerateCandidatesFromParamSpec } from './candidates/index.js';
import {
    DEFAULT_MDE_COMPLETION,
    DEFAULT_MDE_STEPS,
    DEFAULT_MDE_CORRECTIONS,
    DEFAULT_MDE_PRECISION,
    DEFAULT_MDE_RECALL,
    DEFAULT_MDE_F1,
    DEFAULT_MIN_SAMPLE_SIZE,
    SCHEMA_VALIDITY_FLOOR,
} from '@notention/core/telemetry/constants';
import { getStrategyParamConfigsByRole } from '@notention/core/constants/strategyParams';

/**
 * Run a single optimizer cycle
 */
export async function runOptimizerCycle(config: OptimizerConfig = defaultOptimizerConfig()): Promise<OptimizerResult> {
    const cycleId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();
    const revisionStore = getRevisionStore();
    const manifest = readManifest();

    console.log(`🔧 Starting optimizer cycle ${cycleId}`);
    console.log(`   Target seams: ${config.targetSeams.join(', ')}`);
    console.log(`   Max candidates/seam: ${config.maxCandidatesPerSeam}`);

    // Log cycle start
    logEvent({
        type: 'optimizer:cycle:started',
        actor: 'system',
        revisionId: cycleId,
        payload: { type: 'optimizer:cycle:started', config, manifestHash: manifest.hash },
    });

    try {
        // 1. Enumerate all candidates from target seams using shared strategy param configs
        const allCandidates = await enumerateAllCandidates(config);

        console.log(`\n📋 Total candidates: ${allCandidates.length}`);

        if (allCandidates.length === 0) {
            console.log('No tunable candidates found. Exiting.');
            return createEmptyResult(cycleId, manifest.hash, startTime);
        }

        // 2. Run baseline evaluations (intent only - quality is not per-candidate since UI params don't affect core quality)
        const { baselineIntentResult, intentCaseIds } = await runBaselineEvaluations(config);

        // 3. Evaluate candidates
        console.log('\n🚀 Evaluating candidates...');
        const evaluatedCandidates = await evaluateCandidates(
            allCandidates,
            config,
            baselineIntentResult,
            intentCaseIds
        );

        // 4. If using successive halving, promote top candidates and run full evaluation
        if (config.useSuccessiveHalving && evaluatedCandidates.length < allCandidates.length) {
            const promotedCandidates = await runSuccessiveHalvingPromotion(
                evaluatedCandidates,
                allCandidates,
                config,
                baselineIntentResult,
                intentCaseIds
            );
            evaluatedCandidates.push(...promotedCandidates);
        }

        // 5. Classify winners/losers
        const { winners, losers, inconclusive } = classifyCandidates(evaluatedCandidates);

        console.log(`\n📊 Results:`);
        console.log(`   Winners (improved): ${winners.length}`);
        console.log(`   Losers (degraded/invalid): ${losers.length}`);
        console.log(`   Inconclusive: ${inconclusive.length}`);

        // 6. Log cycle completion
        const totalCost = calculateTotalCost(evaluatedCandidates, startTime);

        logEvent({
            type: 'optimizer:cycle:completed',
            actor: 'system',
            revisionId: cycleId,
            payload: {
                type: 'optimizer:cycle:completed',
                candidatesEvaluated: evaluatedCandidates.length,
                winners: winners.length,
                losers: losers.length,
                inconclusive: inconclusive.length,
                totalCost,
            },
        });

        // 7. Save results
        await saveResults(cycleId, manifest.hash, evaluatedCandidates, winners, losers, inconclusive, totalCost);

        return {
            cycleId,
            timestamp: new Date().toISOString(),
            candidatesEvaluated: evaluatedCandidates.length,
            winners,
            losers,
            totalCost,
            manifestHash: manifest.hash,
        };
    } finally {
        cleanupPreviewServer();
    }
}

async function enumerateAllCandidates(config: OptimizerConfig): Promise<OptimizerCandidate[]> {
    const allCandidates: OptimizerCandidate[] = [];

    for (const seamRole of config.targetSeams) {
        const strategyConfigs = getStrategyParamConfigsByRole(seamRole as any);
        console.log(`   Found ${strategyConfigs.length} strategies for seam "${seamRole}"`);

        for (const strategy of strategyConfigs) {
            const candidates = enumerateCandidatesFromParamSpec(strategy, config.maxCandidatesPerSeam);
            console.log(`     ${strategy.id}: ${candidates.length} candidates`);
            allCandidates.push(...candidates);
        }
    }

    return allCandidates;
}

async function runBaselineEvaluations(config: OptimizerConfig): Promise<{
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>;
    intentCaseIds: string[];
}> {
    console.log('\n📏 Running baseline intent evaluation (validation split, limited cases)...');
    const intentCases = readIntentCases('validation'); // Use validation (10 cases) instead of search (21)
    const maxIntentCases = config.maxIntentCases ?? 2;
    const intentCaseIds = intentCases.slice(0, maxIntentCases).map(c => c.id); // Limit cases for speed
    const baselineIntentConfig: IntentEvaluationConfig = {
        split: 'validation',
        repetitions: 1,
        headless: true,
        caseFilter: intentCaseIds,
        revisionPatch: {},
    };
    const baselineIntentResult = await runIntentEvaluationForRevision('incumbent', baselineIntentConfig);

    return { baselineIntentResult, intentCaseIds };
}

async function evaluateCandidates(
    candidates: OptimizerCandidate[],
    config: OptimizerConfig,
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>,
    intentCaseIds: string[]
): Promise<OptimizerCandidate[]> {
    const evaluatedCandidates: OptimizerCandidate[] = [];
    const candidateCache = getCandidateCache();
    const verdictConfig = createVerdictConfig();

    // For successive halving, track candidates by seam for promotion
    const candidatesBySeam = new Map<string, OptimizerCandidate[]>();
    for (const candidate of candidates) {
        const list = candidatesBySeam.get(candidate.seamRole) ?? [];
        list.push(candidate);
        candidatesBySeam.set(candidate.seamRole, list);
    }

    // If using successive halving, run first slice
    let candidatesToEvaluate = candidates;
    if (config.useSuccessiveHalving && candidates.length > config.minPromote) {
        const sliceSize = Math.ceil(candidates.length * config.initialSliceFraction);
        candidatesToEvaluate = candidates.slice(0, sliceSize);
        console.log(`   Using successive halving: evaluating ${candidatesToEvaluate.length}/${candidates.length} candidates in first slice`);
    }

    for (let i = 0; i < candidatesToEvaluate.length; i++) {
        const candidate = candidatesToEvaluate[i];
        console.log(`   [${i + 1}/${candidatesToEvaluate.length}] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);

        const evaluation = await evaluateSingleCandidate(
            candidate,
            baselineIntentResult,
            intentCaseIds,
            verdictConfig,
            candidateCache
        );

        candidate.evaluation = evaluation;
        evaluatedCandidates.push(candidate);
    }

    return evaluatedCandidates;
}

async function evaluateSingleCandidate(
    candidate: OptimizerCandidate,
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>,
    intentCaseIds: string[],
    verdictConfig: VerdictConfig,
    candidateCache: ReturnType<typeof getCandidateCache>
): Promise<CandidateEvaluation> {
    // Check cache first
    const cachedEvaluation = candidateCache.get(candidate.seamRole, candidate.strategyId, candidate.patch);
    if (cachedEvaluation) {
        console.log(`     → Cache hit`);
        return cachedEvaluation;
    }

    // Run intent evaluation for candidate (UI params affect capture/match behavior)
    // Note: Quality evaluation is NOT run per-candidate because strategy params are UI-only
    // and don't affect core extraction/matching quality. Baseline quality is run once.
    console.log(`     🌐 Running intent evaluation (${intentCaseIds.length} cases)...`);
    const candidateIntentResult = await runIntentEvaluationForRevision(candidate.id, {
        split: 'validation',
        repetitions: 1,
        headless: true,
        caseFilter: intentCaseIds,
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

async function runSuccessiveHalvingPromotion(
    evaluatedCandidates: OptimizerCandidate[],
    allCandidates: OptimizerCandidate[],
    config: OptimizerConfig,
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>,
    intentCaseIds: string[]
): Promise<OptimizerCandidate[]> {
    console.log('\n🔼 Successive halving: promoting top candidates...');

    // Sort by primaryDelta descending
    const sortedCandidates = evaluatedCandidates
        .filter(c => c.evaluation)
        .sort((a, b) => (b.evaluation!.primaryDelta ?? -Infinity) - (a.evaluation!.primaryDelta ?? -Infinity));

    const promoteCount = Math.max(config.minPromote, Math.ceil(sortedCandidates.length / 2));
    const promoted = sortedCandidates.slice(0, promoteCount);

    console.log(`   Promoted ${promoted.length} candidates for full evaluation`);

    // Evaluate remaining candidates
    const remainingCandidates = allCandidates.filter(c =>
        !evaluatedCandidates.some(e => e.id === c.id)
    );

    const promotedEvaluated: OptimizerCandidate[] = [];
    const candidateCache = getCandidateCache();
    const verdictConfig = createVerdictConfig();

    for (const candidate of remainingCandidates) {
        console.log(`   [Full] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);

        const evaluation = await evaluateSingleCandidate(
            candidate,
            baselineIntentResult,
            intentCaseIds,
            verdictConfig,
            candidateCache
        );

        candidate.evaluation = evaluation;
        promotedEvaluated.push(candidate);
    }

    return promotedEvaluated;
}

function classifyCandidates(evaluatedCandidates: OptimizerCandidate[]): {
    winners: OptimizerCandidate[];
    losers: OptimizerCandidate[];
    inconclusive: OptimizerCandidate[];
} {
    const winners = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'improved');
    const losers = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'degraded' || c.evaluation?.verdict === 'invalid');
    const inconclusive = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'inconclusive');
    return { winners, losers, inconclusive };
}

function calculateTotalCost(evaluatedCandidates: OptimizerCandidate[], startTime: number): {
    browserRuns: number;
    tokensUsed: number;
    durationMs: number;
} {
    return {
        browserRuns: evaluatedCandidates.reduce((sum, c) => sum + (c.evaluation?.cost.browserRuns ?? 0), 0),
        tokensUsed: evaluatedCandidates.reduce((sum, c) => sum + (c.evaluation?.cost.tokensUsed ?? 0), 0),
        durationMs: Date.now() - startTime,
    };
}

function createVerdictConfig(): VerdictConfig {
    return {
        primaryMetric: 'completion',
        mde: {
            completion: DEFAULT_MDE_COMPLETION,
            steps: DEFAULT_MDE_STEPS,
            corrections: DEFAULT_MDE_CORRECTIONS,
            precision: DEFAULT_MDE_PRECISION,
            recall: DEFAULT_MDE_RECALL,
            f1: DEFAULT_MDE_F1,
        },
        floors: { schemaValidity: SCHEMA_VALIDITY_FLOOR },
        minSampleSize: DEFAULT_MIN_SAMPLE_SIZE,
    };
}

function createEmptyResult(cycleId: string, manifestHash: string, startTime: number): OptimizerResult {
    return {
        cycleId,
        timestamp: new Date().toISOString(),
        candidatesEvaluated: 0,
        winners: [],
        losers: [],
        totalCost: { browserRuns: 0, tokensUsed: 0, durationMs: Date.now() - startTime },
        manifestHash,
    };
}

async function saveResults(
    cycleId: string,
    manifestHash: string,
    evaluatedCandidates: OptimizerCandidate[],
    winners: OptimizerCandidate[],
    losers: OptimizerCandidate[],
    inconclusive: OptimizerCandidate[],
    totalCost: { browserRuns: number; tokensUsed: number; durationMs: number }
): Promise<void> {
    const outputDir = join('optimize/runs', cycleId);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(join(outputDir, 'results.json'), JSON.stringify({
        cycleId,
        timestamp: new Date().toISOString(),
        candidatesEvaluated: evaluatedCandidates.length,
        winners: winners.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        losers: losers.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        inconclusive: inconclusive.map(c => ({ id: c.id, patch: c.patch, delta: c.evaluation?.primaryDelta })),
        totalCost,
        manifestHash,
    }, null, 2));
}

// Re-export types and utilities for external use
export {
    type OptimizerConfig,
    type OptimizerCandidate,
    type OptimizerResult,
    type CandidateEvaluation,
    defaultOptimizerConfig,
} from './types/index.js';
export {
    enumerateCandidatesFromParamSpec,
    validatePatch,
    hashPatch,
} from './candidates/index.js';
export { getCandidateCache, resetCandidateCache } from './cache/index.js';