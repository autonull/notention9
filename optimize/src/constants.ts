/**
 * Shared constants for the optimize package
 * Centralizes magic strings and numbers for maintainability
 */

// Corpus output directory locations
export const CORPUS_OUTPUT_DIRS = [
    'loop/corpus-output',
    'loop/runs/corpus-output',
] as const;

// Seam roles that have built-in specifications
export const BUILTIN_SEAM_ROLES = [
    'capture',
    'elicit',
    'extraction',
    'template',
] as const;

// Default inference options
export const DEFAULT_INFERENCE_OPTIONS = {
    timeout: 30000,
    maxRetries: 2,
    temperature: 0.1,
    autoRepair: true,
} as const;

// Provider capability probe timeout
export const CAPABILITY_PROBE_TIMEOUT = 5000;

// Step execution timeouts
export const STEP_VISIBLE_TIMEOUT_MS = 10000;
export const STEP_ATTACHED_TIMEOUT_MS = 5000;
export const STEP_MODAL_VISIBLE_TIMEOUT_MS = 15000;
export const STEP_MODAL_ATTACHED_TIMEOUT_MS = 10000;
export const STATE_WAIT_DEFAULT_TIMEOUT_MS = 5000;

// Provider capability probe test prompt
export const CAPABILITY_PROBE_PROMPT = `Return a JSON object: {"test": "ok"}`;

// Extraction stage priorities (lower = runs first) - re-exported from core
export { EXTRACTION_STAGE_PRIORITIES, EXTRACTION_STAGE_CONFIDENCE, DEFAULT_EXTRACTION_OPTIONS } from '@notention/core/extraction';

// Default loop configuration
export const DEFAULT_LOOP_CONFIG = {
    discovery: {
        sourceDirs: ['ui/src', 'core/src', 'simulator/src'],
        excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/fixtures/**', '**/dist/**', '**/node_modules/**'],
    },
    version: '1.0.0',
} as const;

// Default artifact paths
export const ARTIFACT_NAMES = {
    discovered: 'discovered.json',
    tasks: 'tasks.json',
    golden: 'golden.jsonl',
    gateReports: 'gate-reports.json',
    candidatesDir: 'candidates',
    baseline: 'baseline.json',
    evaluationReport: 'evaluation-report.json',
    adoption: 'adoption.json',
    prioritized: 'prioritized.json',
} as const;

// File patterns for scanning
export const SCAN_PATTERNS = {
    uiComponents: '**/*.tsx',
    typeScriptSources: '**/*.ts',
    excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/fixtures/**', '**/dist/**', '**/node_modules/**'],
} as const;

// Golden case mining defaults
export const GOLDEN_CASE_DEFAULTS = {
    minConfidence: 0.5,
    maxCases: 20,
    maxTotalCases: 50,
    evidenceDir: 'doc/evidence',
    testDirs: ['core/src/tests', 'ui/src/tests', 'optimize/src/tests'],
    curatedFile: 'loop/golden-cases.json',
} as const;

// Evaluation defaults
export const EVALUATION_DEFAULTS = {
    minRepetitions: 10,
    captureMaxDurationMs: 20000,
} as const;

// Dialog component tags
export const DIALOG_COMPONENT_TAGS = ['Modal', 'Dialog', 'Popover', 'Drawer'] as const;

// Routing component tags
export const ROUTING_COMPONENT_TAGS = ['Route', 'Routes', 'Switch'] as const;

// Link component tags
export const LINK_COMPONENT_TAGS = ['Link', 'NavLink'] as const;

// Form input tags
export const FORM_INPUT_TAGS = ['input', 'select', 'textarea', 'Input', 'Select', 'Textarea'] as const;

// Click handler names
export const CLICK_HANDLERS = ['onClick', 'onPress', 'onSubmit', 'onSelect'] as const;

// Provider kinds
export const PROVIDER_KINDS = ['heuristic', 'local-model', 'remote'] as const;

// Default ontology
export const DEFAULT_ONTOLOGY_NAME = 'DEFAULT_ONTOLOGY';

// Loop run directory prefix
export const RUN_DIR_PREFIX = 'run-';

// Dry run output directory
export const DEFAULT_OUTPUT_DIR = 'loop/runs';

// Seam role constants - re-exported from core for consistency
export { SEAM_ROLES } from '@notention/core/constants/seams';

// Strategy kinds
export const STRATEGY_KINDS = ['prompt', 'ui', 'ontology-facet'] as const;

// Capability names
export const CAPABILITIES = {
    STRUCTURED_OUTPUT: 'structured-output',
    CONTEXT_4K: 'context>=4k',
} as const;

// File extensions
export const FILE_EXTENSIONS = {
    SPEC: 'spec.json',
    STRATEGY: 'strategy.tsx',
    PROVENANCE: 'provenance.json',
} as const;

// JSONL extension
export const JSONL_EXTENSION = 'jsonl';

// Timestamp format for run directories
export const TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH-mm-ss';

// Property ID separator
export const PROP_ID_SEPARATOR = '\u0000';

// Stop words for fuzzy matching
export const STOP_WORDS_SET = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
]);