/**
 * Telemetry & Evaluation Constants
 * Centralized configuration for all magic numbers in telemetry and evaluation modules
 */

// --- Journal / Friction Discovery ---

/** Default retention period for friction journal (days) */
export const DEFAULT_JOURNAL_RETENTION_DAYS = 90;

/** Decay half-life for evidence weight (days) - weight halves every N days */
export const EVIDENCE_DECAY_HALF_LIFE_DAYS = 30;

/** Auto-flush interval for journal buffer (ms) */
export const JOURNAL_AUTO_FLUSH_INTERVAL_MS = 30_000;

/** Evidence class weights for prioritization (measured > observed > hypothesized > asserted) */
export const EVIDENCE_CLASS_WEIGHTS: Record<string, number> = {
    measured: 1.0,
    observed: 0.7,
    hypothesized: 0.4,
    asserted: 0.1,
};

/** Top N signals per workflow in weekly digest */
export const DIGEST_TOP_SIGNALS_PER_WORKFLOW = 5;

/** Weekly digest lookback window (days) */
export const DIGEST_LOOKBACK_DAYS = 7;

// --- Correction Flow ---

/** Minimum occurrences before a correction pattern is considered learned */
export const CORRECTION_MIN_OCCURRENCES = 3;

/** Minimum confidence to apply a correction pattern */
export const CORRECTION_MIN_CONFIDENCE = 0.7;

/** Maximum number of correction patterns to store */
export const CORRECTION_MAX_PATTERNS = 1000;

/** Decay factor for old correction patterns (0-1, applied periodically) */
export const CORRECTION_DECAY_FACTOR = 0.95;

/** Base confidence for new correction patterns */
export const CORRECTION_BASE_CONFIDENCE = 0.5;

/** Confidence increment per occurrence */
export const CORRECTION_CONFIDENCE_INCREMENT = 0.1;

/** Maximum confidence for correction patterns */
export const CORRECTION_MAX_CONFIDENCE = 0.95;

/** Maximum examples to store per correction pattern */
export const CORRECTION_MAX_EXAMPLES = 10;

// --- Calibration ---

/** Default ECE (Expected Calibration Error) threshold */
export const DEFAULT_ECE_THRESHOLD = 0.1;

/** Default number of bins for ECE computation */
export const DEFAULT_ECE_BINS = 10;

// --- Coverage ---

/** Default minimum overall ontology coverage ratio */
export const DEFAULT_MIN_OVERALL_COVERAGE = 0.7;

/** Default minimum per-node coverage ratio */
export const DEFAULT_MIN_NODE_COVERAGE = 0.5;

/** Default maximum uncovered critical nodes */
export const DEFAULT_MAX_UNCOVERED_CRITICAL = 3;

// --- Verdict / Evaluation ---

/** Default minimum detectable effect for completion metric */
export const DEFAULT_MDE_COMPLETION = 0.10;

/** Default minimum detectable effect for steps metric */
export const DEFAULT_MDE_STEPS = -0.5;

/** Default minimum detectable effect for corrections metric */
export const DEFAULT_MDE_CORRECTIONS = -0.2;

/** Default minimum detectable effect for precision metric */
export const DEFAULT_MDE_PRECISION = 0.05;

/** Default minimum detectable effect for recall metric */
export const DEFAULT_MDE_RECALL = 0.05;

/** Default minimum detectable effect for F1 metric */
export const DEFAULT_MDE_F1 = 0.05;

/** Default minimum sample size for statistical tests */
export const DEFAULT_MIN_SAMPLE_SIZE = 30;

/** Schema validity floor (must be 1.0) */
export const SCHEMA_VALIDITY_FLOOR = 1.0;

// --- Commitment Lifecycle ---

/** Default auto-lapse check interval (ms) */
export const DEFAULT_AUTO_LAPSE_INTERVAL_MS = 60_000;

/** Default: require deadline for commitment */
export const DEFAULT_REQUIRE_DEADLINE = true;

/** Default: allow reopening done/lapsed commitments */
export const DEFAULT_ALLOW_REOPEN = true;

// --- Co-occurrence Pattern Recognition ---

/** Default minimum occurrences for co-occurrence patterns */
export const COOCCURRENCE_MIN_OCCURRENCES = 2;

/** Default temporal window for co-occurrence (ms) - 1 hour */
export const COOCCURRENCE_TEMPORAL_WINDOW_MS = 60 * 60 * 1000;

/** Default minimum confidence for co-occurrence patterns */
export const COOCCURRENCE_MIN_CONFIDENCE = 0.3;

// --- Golden Case Mining ---

/** Default minimum confidence for golden cases */
export const GOLDEN_CASE_MIN_CONFIDENCE = 0.8;

/** Default maximum golden cases to return */
export const GOLDEN_CASE_MAX_CASES = 20;

// --- Agent Skill Registry ---

/** Default minimum confidence for skill matching */
export const SKILL_MATCH_MIN_CONFIDENCE = 0.5;

// --- Remote Telemetry ---

/** Default sample rate for remote telemetry (10%) */
export const DEFAULT_REMOTE_SAMPLE_RATE = 0.1;

// --- Meshtastic Network ---

/** Default priority for meshtastic messages */
export const DEFAULT_MESHTASTIC_PRIORITY = 0.1;