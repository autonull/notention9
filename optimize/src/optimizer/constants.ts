/**
 * Optimizer module constants - centralized magic numbers and configuration values
 */

// Preview server constants
export const PREVIEW_PORT_SEARCH_START = 4199;
export const PREVIEW_PORT_SEARCH_RANGE = 100;
export const PREVIEW_START_TIMEOUT_MS = 120_000;
export const PREVIEW_POLL_INTERVAL_MS = 1000;

// Intent evaluation constants
export const INTENT_NAVIGATION_TIMEOUT_MS = 5000;
export const INTENT_EXTRACTION_WAIT_MS = 300;
export const INTENT_DEFAULT_VIEWPORT = { width: 1280, height: 720 } as const;

// Time constants
export const MILLISECONDS_PER_DAY = 86_400_000;
export const MILLISECONDS_PER_TWO_DAYS = 172_800_000;

// Cache constants
export const CACHE_DIR = 'optimize/cache';
export const CACHE_FILE_NAME = 'candidate-cache.json';

// Output constants
export const RUNS_DIR = 'optimize/runs';

// Default optimizer configuration values
export const DEFAULT_MAX_CANDIDATES_PER_SEAM = 8;
export const DEFAULT_MAX_BROWSER_RUNS = 160;
export const DEFAULT_MAX_TIME_MINUTES = 30;
export const DEFAULT_MAX_TOKENS = 150_000;
export const DEFAULT_USE_SUCCESSIVE_HALVING = true;
export const DEFAULT_INITIAL_SLICE_FRACTION = 0.25;
export const DEFAULT_MIN_PROMOTE = 2;
export const DEFAULT_MAX_INTENT_CASES = 2;

// Default target seams
export const DEFAULT_TARGET_SEAMS = ['capture', 'match'] as const;

// Successive halving constants
export const SUCCESSIVE_HALVING_MIN_CANDIDATES = 2;

// Verdict defaults (re-exported from core for convenience)
export const DEFAULT_MDE_COMPLETION = 0.05;
export const DEFAULT_MDE_STEPS = 0.5;
export const DEFAULT_MDE_CORRECTIONS = 0.1;
export const DEFAULT_MDE_PRECISION = 0.05;
export const DEFAULT_MDE_RECALL = 0.05;
export const DEFAULT_MDE_F1 = 0.05;
export const DEFAULT_MIN_SAMPLE_SIZE = 10;
export const SCHEMA_VALIDITY_FLOOR = 0.95;

// Common timeouts used in steps/journeys
export const STEP_DEFAULT_TIMEOUT_MS = 5000;
export const MODAL_TIMEOUT_MS = 15000;
export const MODAL_WAIT_TIMEOUT_MS = 10000;
export const SIMULATOR_REGRESSION_TIMEOUT_MS = 120_000;
export const CAPABILITY_PROBE_TIMEOUT_MS = 5000;

// State wait defaults
export const STATE_WAIT_DEFAULT_TIMEOUT_MS = 5000;
export const STATE_WAIT_QUICK_TIMEOUT_MS = 3000;