import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { logEvent } from '@notention/core/telemetry/ledger';
import { readManifest } from '@notention/core/eval/caseManifest';
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
import { checkEvaluationPower } from './evaluation/verdicts.js';
import { getCandidateCache } from './cache/index.js';
import { enumerateAllCandidates } from './enumerateCandidates.js';
import { evaluateSingleCandidate, runBaselineEvaluations } from './evaluateCandidate.js';
import { runSuccessiveHalvingPromotion } from './successiveHalving.js';
import { classifyCandidates, calculateTotalCost, createEmptyResult } from './classify.js';
import { createVerdictConfig } from './verdictConfig.js';
import { saveResults } from './saveResults.js';

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

        // Power check: refuse to run if underpowered
        const verdictConfig = createVerdictConfig();
        const powerCheck = checkEvaluationPower(verdictConfig, intentCaseIds.length, 3); // full evaluation uses 3 reps
        if (!powerCheck.powered) {
            console.log(`\n⛔ Refusing to run: ${powerCheck.reason}`);
            logEvent({
                type: 'optimizer:cycle:completed',
                actor: 'system',
                revisionId: cycleId,
                payload: {
                    type: 'optimizer:cycle:completed',
                    candidatesEvaluated: 0,
                    winners: 0,
                    losers: 0,
                    inconclusive: 0,
                    totalCost: { browserRuns: 0, tokensUsed: 0, durationMs: Date.now() - startTime },
                },
            });
            return {
                cycleId,
                timestamp: new Date().toISOString(),
                candidatesEvaluated: 0,
                winners: [],
                losers: [],
                totalCost: { browserRuns: 0, tokensUsed: 0, durationMs: Date.now() - startTime },
                manifestHash: manifest.hash,
            };
        }
        console.log(`✅ Power check passed: ${intentCaseIds.length} cases × 3 reps = ${intentCaseIds.length * 3} samples (min ${verdictConfig.minSampleSize})`);

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
            candidateCache,
            false
        );

        candidate.evaluation = evaluation;
        evaluatedCandidates.push(candidate);
    }

    return evaluatedCandidates;
}

// Re-export types and utilities for external use
export {
    type OptimizerConfig,
    type OptimizerCandidate,
    type OptimizerResult,
    type CandidateEvaluation as OptimizerCandidateEvaluation,
    defaultOptimizerConfig,
} from './types/index.js';
export {
    enumerateCandidatesFromParamSpec,
    validatePatch,
    hashPatch,
} from './candidates/index.js';
export { getCandidateCache, resetCandidateCache } from './cache/index.js';