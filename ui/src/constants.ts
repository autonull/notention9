/**
 * Shared constants for the UI package
 * Centralizes magic strings and numbers for maintainability
 */

// Default inference options
export const DEFAULT_INFERENCE_OPTIONS = {
    timeout: 30000,
    maxRetries: 2,
    temperature: 0.1,
    autoRepair: true,
} as const;

// Provider capability probe timeout
export const CAPABILITY_PROBE_TIMEOUT = 5000;

// Provider capability probe test prompt
export const CAPABILITY_PROBE_PROMPT = `Return a JSON object: {"test": "ok"}`;

// Default extraction options
export const DEFAULT_EXTRACTION_OPTIONS = {
    intents: true,
    patterns: true,
    ontologyKeys: true,
    fuzzy: true,
    price: true,
    dates: true,
    roles: true,
    ranges: true,
    maxProperties: 50,
    fuzzyThreshold: 0.8,
} as const;

// Provider kinds
export const PROVIDER_KINDS = ['heuristic', 'local-model', 'remote'] as const;

// Default ontology name
export const DEFAULT_ONTOLOGY_NAME = 'DEFAULT_ONTOLOGY';

// Property ID separator
export const PROP_ID_SEPARATOR = '\u0000';