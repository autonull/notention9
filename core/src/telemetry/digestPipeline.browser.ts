/**
 * Browser-safe Digest Pipeline - stub for compatibility
 * Full implementation is Node-only (uses file system)
 */

import type { FrictionSignal } from './journal.js';
import type { DigestPipelineConfig } from './frictionUtils.js';

export function createDigestPipeline(): {
    process: (signals: FrictionSignal[]) => FrictionSignal[];
    getConfig: () => DigestPipelineConfig;
} {
    return {
        process: (signals) => signals,
        getConfig: () => ({
            lookbackDays: 7,
            topSignalsPerWorkflow: 5,
            evidenceClassWeights: { measured: 1.0, observed: 0.7, hypothesized: 0.4, asserted: 0.1 },
            decayHalfLifeDays: 30,
            minCountForMeasured: 3,
            minAgeForHypothesized: 14,
        }),
    };
}