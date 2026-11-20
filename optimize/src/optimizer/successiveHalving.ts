import type { OptimizerCandidate } from './types/index.js';
import { evaluateSingleCandidate } from './evaluateCandidate.js';
import { getCandidateCache, type CandidateCache } from './cache/index.js';
import { createVerdictConfig } from './verdictConfig.js';
import { runIntentEvaluationForRevision } from './evaluation/intentEvaluation.js';

export async function runSuccessiveHalvingPromotion(
    evaluatedCandidates: OptimizerCandidate[],
    allCandidates: OptimizerCandidate[],
    config: import('./types/index.js').OptimizerConfig,
    baselineIntentResult: Awaited<ReturnType<typeof runIntentEvaluationForRevision>>,
    intentCaseIds: string[]
): Promise<OptimizerCandidate[]> {
    console.log('\n🔼 Successive halving: promoting top candidates...');

    // Sort by primaryDelta descending
    const sortedCandidates = evaluatedCandidates
        .filter(c => c.evaluation)
        .sort((a, b) => (b.evaluation!.primaryDelta ?? -Infinity) - (a.evaluation!.primaryDelta ?? -Infinity));

    const promoteCount = Math.max(config.minPromote, Math.ceil(sortedCandidates.length * config.initialSliceFraction));
    const promoted = sortedCandidates.slice(0, promoteCount);

    console.log(`   Promoted ${promoted.length} candidates for full evaluation (${config.initialSliceFraction * 100}% slice)`);

    // Evaluate ONLY the promoted candidates with full evaluation (more cases, more repetitions)
    // The non-promoted candidates keep their initial evaluation (already done in first slice)
    const promotedEvaluated: OptimizerCandidate[] = [];
    const candidateCache = getCandidateCache();
    const verdictConfig = createVerdictConfig();

    for (const candidate of promoted) {
        console.log(`   [Full] ${candidate.id} (${candidate.seamRole}/${candidate.strategyId})`);

        // Re-evaluate with full case set and repetitions
        const evaluation = await evaluateSingleCandidate(
            candidate,
            baselineIntentResult,
            intentCaseIds, // Full case set
            verdictConfig,
            candidateCache,
            true // fullEvaluation flag
        );

        candidate.evaluation = evaluation;
        promotedEvaluated.push(candidate);
    }

    return promotedEvaluated;
}