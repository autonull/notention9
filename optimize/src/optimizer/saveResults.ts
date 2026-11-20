import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { OptimizerCandidate } from './types/index.js';
import { getRunDir } from './constants.js';

export async function saveResults(
    cycleId: string,
    manifestHash: string,
    evaluatedCandidates: OptimizerCandidate[],
    winners: OptimizerCandidate[],
    losers: OptimizerCandidate[],
    inconclusive: OptimizerCandidate[],
    totalCost: { browserRuns: number; tokensUsed: number; durationMs: number }
): Promise<void> {
    const outputDir = getRunDir(cycleId);
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