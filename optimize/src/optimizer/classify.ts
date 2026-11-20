import type { OptimizerCandidate, CandidateEvaluation } from './types/index.js';

export function classifyCandidates(evaluatedCandidates: OptimizerCandidate[]): {
    winners: OptimizerCandidate[];
    losers: OptimizerCandidate[];
    inconclusive: OptimizerCandidate[];
} {
    const winners = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'improved');
    const losers = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'degraded' || c.evaluation?.verdict === 'invalid');
    const inconclusive = evaluatedCandidates.filter(c => c.evaluation?.verdict === 'inconclusive');
    return { winners, losers, inconclusive };
}

export function calculateTotalCost(evaluatedCandidates: OptimizerCandidate[], startTime: number): {
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

export function createEmptyResult(cycleId: string, manifestHash: string, startTime: number): import('./types/index.js').OptimizerResult {
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