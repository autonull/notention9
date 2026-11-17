/**
 * Browser-safe Friction Utils - re-exports from main module
 * The main module is already browser-compatible (no Node deps)
 */

// Constants from telemetry/constants.ts
export {
    DEFAULT_JOURNAL_RETENTION_DAYS,
    JOURNAL_AUTO_FLUSH_INTERVAL_MS,
    EVIDENCE_DECAY_HALF_LIFE_DAYS,
    EVIDENCE_CLASS_WEIGHTS,
    DIGEST_TOP_SIGNALS_PER_WORKFLOW,
    DIGEST_LOOKBACK_DAYS,
    MS_PER_DAY,
} from './constants.js';

// Functions from frictionUtils.ts
export {
    createSessionId,
    inferEvidenceClass,
    serializeFrictionEvents,
    filterEventsByTime,
    aggregateEvents,
    rankAggregates,
    groupSignalsByWorkflow,
    computeWeight,
    msToDays,
    createDigestConfig,
} from './frictionUtils.js';

// Types
export type {
    FrictionEvent,
    FrictionAggregate,
    FrictionSignal,
    JournalConfig,
    FrictionKind,
    DurationBucket,
    EvidenceClass,
    DigestPipelineConfig,
} from './frictionUtils.js';