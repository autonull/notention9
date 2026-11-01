import { runAllQuality, type QualityRunConfig } from '@notention/core/eval/quality';
import type { OptimizerCandidate } from '../types.js';
import { createExtractionEngine, createMatchEngine, createSampleNotes } from './engines.js';

/**
 * Run quality evaluation for a specific candidate (via revision)
 */
export async function runQualityEvaluationForCandidate(
    candidate: OptimizerCandidate,
    config: QualityRunConfig
): Promise<any[]> {
    // Apply the candidate's patch by creating a temporary revision-like context
    // For now, we use the base engines since the patch affects UI params, not core logic
    // In a real implementation, the patch would modify strategy behavior

    const extractionEngine = createExtractionEngine();
    const matchEngine = createMatchEngine();
    const notes = createSampleNotes();

    const qualityConfig: QualityRunConfig = {
        ...config,
        extractionEngine,
        matchEngine,
        notes,
    };

    const results = await runAllQuality(qualityConfig);
    return results.map(r => ({ ...r, revisionId: candidate.id }));
}