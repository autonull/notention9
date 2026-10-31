/**
 * Extraction stage configuration constants
 * Centralized to avoid duplication between core and optimize packages
 */

export type ExtractionStageName = 'deterministic' | 'pattern' | 'ai' | 'fuzzy';

/**
 * Extraction stage priorities (lower = runs first)
 */
export const EXTRACTION_STAGE_PRIORITIES: Record<ExtractionStageName, number> = {
    deterministic: 10,
    pattern: 20,
    ai: 30,
    fuzzy: 40,
};

/**
 * Extraction stage confidence scores
 */
export const EXTRACTION_STAGE_CONFIDENCE: Record<ExtractionStageName, number> = {
    deterministic: 0.95,
    pattern: 0.85,
    ai: 0.8,
    fuzzy: 0.6,
};

/**
 * Default extraction options
 */
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

/**
 * Get stage priority by name
 */
export function getStagePriority(name: ExtractionStageName): number {
    return EXTRACTION_STAGE_PRIORITIES[name] ?? 50;
}

/**
 * Get stage confidence by name
 */
export function getStageConfidence(name: ExtractionStageName): number {
    return EXTRACTION_STAGE_CONFIDENCE[name] ?? 0.5;
}