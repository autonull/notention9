/**
 * Centralized configuration and constants for Notention
 * Single source of truth for all packages
 */

// ============================================================================
// Environment & Runtime
// ============================================================================

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const IS_TEST = import.meta.env.MODE === 'test';

export function getProjectRoot(): string {
    // Vite defines import.meta.env.PROJECT_ROOT at build time
    return import.meta.env.PROJECT_ROOT ?? '/home/me/notention9';
}

export function getOptimizeDir(): string {
    return `${getProjectRoot()}/optimize`;
}

// ============================================================================
// Semantic Note Constants
// ============================================================================

export const SEMANTIC_NOTE_KIND = 35000;

export const NOTE_STATUS = {
    RUNNING: 'running' as const,
    QUEUED: 'queued' as const,
    KEY: 'status' as const,
} as const;

// ============================================================================
// Ontology Constants
// ============================================================================

export const EMERGENT_NODE_ID = 'emergent';
export const EMERGENT_NODE_LABEL = 'Emergent';

// ============================================================================
// Property Key Constants
// ============================================================================

export const DATE_PROPERTY_KEYS = ['date', 'deadline', 'start', 'end'] as const;

// ============================================================================
// Suggestion Thresholds
// ============================================================================

export const SUGGESTION_THRESHOLD = {
    DEV: 1,
    PROD: 3,
} as const;

// ============================================================================
// Regex Constants
// ============================================================================

export const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
export const GEO_REGEX = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
export const RANGE_REGEX = /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/;

// ============================================================================
// Matching Constants
// ============================================================================

export const NUMERIC_OPS = new Set([
    'less than', 'greater than', 'less than or equal', 'greater than or equal',
    '<', '>', '<=', '>=', 'between', 'range'
]);

export const DATE_OPS = new Set(['is after', 'is before', 'after', 'before']);

export const GEO_OPS = new Set(['is near', 'near']);

export const CANONICAL: Record<string, string> = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    react: 'react',
    reactjs: 'react',
    node: 'nodejs',
    nodejs: 'nodejs',
    dev: 'developer',
    developer: 'developer',
    engineer: 'developer',
    eng: 'engineer',
    swe: 'software engineer',
    'software engineer': 'software engineer',
    remote: 'remote',
    wfh: 'remote',
    distributed: 'remote',
};

// ============================================================================
// Parsing Constants
// ============================================================================

export const SYMBOL_TO_OP: Record<string, string> = {
    '<=': 'less than or equal',
    '>=': 'greater than or equal',
    '<': 'less than',
    '>': 'greater than',
    '=': 'is',
    ':': 'is',
    '!=': 'is not',
    '≈': 'is near',
    '∋': 'contains',
};

export const COMMON_WORDS = new Set([
    'not', 'neither', 'the', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can',
    'this', 'that', 'these', 'those',
    'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

export const REGEX = {
    WORD_OP: /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/i,
    COLON: /^([^\s]+):(.+)$/,
    PHONE: /(\+?\d{10,15})/,
    EMAIL: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    BUDGET: /(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/i,
    SPACE: /^([^\s]+)\s+(.+)$/,
    VALID_KEY: /^[a-zA-Z[\]][a-zA-Z0-9_.[\]\s-]*$/,
    BRACKET: /\[([^\]]+)\]/g,
    MACRO: /@([a-zA-Z0-9_]+)/g,
    SPAN: /<span\s+[^>]*data-type=["']property["'][^>]*>/g,
    SPAN_ATTR_NAME: /data-name=["']([^"']+)["']/,
    SPAN_ATTR_OP: /data-operator=["']([^"']+)["']/,
    SPAN_ATTR_VAL: /data-value=["']([^"']+)["']/,
    HTML_TAGS: /<[^>]+>/g,
    BLOCK_TAGS: /<\/(p|div|h[1-6]|li|blockquote|pre)>/gi,
    BR_TAGS: /<br\s*\/?>/gi,
} as const;

export const SYMBOLIC_REGEXES = Object.entries(SYMBOL_TO_OP)
    .sort(([a], [b]) => b.length - a.length)
    .map(([sym, op]) => ({
        regex: new RegExp(`^(.+?)\\s*(${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*(.*)$`),
        op,
    }));

// ============================================================================
// Daily Prompts
// ============================================================================

export const DAILY_PROMPTS = [
    "What's one thing you learned today?",
    'Describe a problem you\'re trying to solve.',
    'Draft a message to a potential collaborator.',
    'List 3 goals for this week.',
    'Capture a quick thought about a project.',
    'Who would be a valuable connection right now?',
    'What knowledge is missing from your network?',
] as const;

// ============================================================================
// Seam Roles
// ============================================================================

export const SEAM_ROLES = {
    CAPTURE: 'capture',
    ELICIT: 'elicit',
    MATCH: 'match',
    DISPLAY: 'display',
    LAYOUT: 'layout',
    ONTOLOGY: 'ontology',
    INTENT: 'intent',
} as const;

export type SeamRole = typeof SEAM_ROLES[keyof typeof SEAM_ROLES];

export function resolveSeamId(role: SeamRole, strategyRegistry?: { listSeams(): Array<{ id: string }> }): string {
    if (!strategyRegistry) return role;

    const seams = strategyRegistry.listSeams();
    const discovered = seams.find(s => s.id.startsWith(`${role}-`));
    return discovered?.id ?? role;
}

export function getSeamIdsForRole(role: SeamRole, strategyRegistry?: { listSeams(): Array<{ id: string }> }): string[] {
    if (!strategyRegistry) return [role];

    const seams = strategyRegistry.listSeams();
    return seams.filter(s => s.id.startsWith(`${role}-`)).map(s => s.id);
}

// ============================================================================
// UI Constants (shared)
// ============================================================================

export const UI_CONSTANTS = {
    SIDEBAR_WIDTH: 320,
    SIDEBAR_COLLAPSED_WIDTH: 48,
    MAX_SIDEBAR_WIDTH: 600,
    ITEM_HEIGHT: 84,
} as const;

// ============================================================================
// Platform Constants
// ============================================================================

export const isMac = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel';
export const MOD_LABEL = isMac ? '⌘' : 'Ctrl';

export function modShortcut(key: string): string {
    return `${MOD_LABEL}+${key}`;
}

// ============================================================================
// Loop Config Schema (re-exported for optimize)
// ============================================================================

export interface LoopConfigSchema {
    definitions: {
        loopConfig: Record<string, unknown>;
    };
}

let cachedLoopSchema: LoopConfigSchema | null = null;

export async function loadLoopConfigSchema(): Promise<LoopConfigSchema> {
    if (cachedLoopSchema) return cachedLoopSchema;
    const response = await fetch(`${getProjectRoot()}/optimize/loop/schema.json`);
    cachedLoopSchema = await response.json();
    return cachedLoopSchema;
}

export async function validateLoopConfig(config: unknown): Promise<void> {
    const { Ajv } = await import('ajv');
    const schema = await loadLoopConfigSchema();
    const ajv = new (Ajv.default || Ajv)({ allErrors: true, strict: false });
    const validate = ajv.compile({
        ...schema.definitions.loopConfig,
        definitions: schema.definitions,
    });
    const valid = validate(config);
    if (!valid) {
        throw new Error(`Loop config validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
    }
}

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
    AI_INFERENCE: true,
    ONTOLOGY_OPTIMIZATION: true,
    TELEMETRY: import.meta.env.VITE_TELEMETRY === 'true',
    DEV_HOOKS: import.meta.env.VITE_DEV_HOOKS === 'true',
} as const;

// ============================================================================
// Type exports for consumers
// ============================================================================

export type {
    // Re-export commonly used types
} from './types/index.js';