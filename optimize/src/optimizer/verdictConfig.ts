import type { VerdictConfig } from './types/index.js';
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

export function createVerdictConfig(): VerdictConfig {
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