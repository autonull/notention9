import type { Note, Property } from '../types';

/**
 * PropertyPattern defines semantic patterns that skills recognize.
 * Skills match notes based on the presence of specific property keys
 * that align with the ontology structure.
 *
 * Example: IndeedSkill matches notes with properties like:
 * - role, location, salary (job-request pattern)
 * - skill, experience, remote (freelance-offer pattern)
 */
export interface PropertyPattern {
    /** Property keys that MUST be present for this pattern to match */
    required: string[];

    /** Property keys that SHOULD be present (increases match confidence) */
    optional?: string[];

    /** Minimum number of total properties for pattern to be considered valid */
    minProperties?: number;
}

/**
 * BrowserAction represents an action to be performed in a browser.
 * Skills translate semantic notes into browser actions that interact with external websites.
 */
export interface BrowserAction {
    type: 'navigate' | 'fill-form' | 'click' | 'scrape' | 'wait' | 'type' | 'screenshot';

    /** URL to navigate to (for 'navigate' type) */
    url?: string;

    /** CSS selector for target element */
    selector?: string;

    /** Value to fill/click (for 'fill-form' type) */
    value?: string;

    /** Text to type (for 'type' type) */
    text?: string;

    /** Data extraction rules (for 'scrape' type) */
    scrapeRules?: {
        [key: string]: string; // property key -> CSS selector
    };

    /** Wait duration in ms (for 'wait' type) */
    duration?: number;

    /** Path to save screenshot (for 'screenshot' type) */
    path?: string;

    /** Whether to take full page screenshot */
    fullPage?: boolean;

    /** Human-readable description of this action */
    description?: string;
}

/**
 * APIAction represents a direct API call.
 * Some skills may prefer API calls over browser automation.
 */
export interface APIAction {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    transformResponse?: (data: unknown) => Note[];
}

/**
 * ExternalAction is a union of all possible external actions.
 */
export type ExternalAction = BrowserAction | APIAction;

/**
 * ActionSequence represents a series of actions to complete a workflow.
 */
export interface ActionSequence {
    /** Unique identifier for this action sequence */
    id: string;

    /** Human-readable name */
    name: string;

    /** Source note that triggered this sequence */
    sourceNote: Note;

    /** Ordered list of actions to execute */
    actions: BrowserAction[];

    /** Expected outcome (e.g., "5-10 job listings imported") */
    expectedOutcome?: string;
}

/**
 * Skill is the core interface that all skills must implement.
 * Skills act as translators between the universal semantic space (notes + ontology)
 * and external systems (websites, APIs, files).
 *
 * A skill:
 * 1. Identifies notes that match its pattern (ontology-driven)
 * 2. Exports notes to external actions (Note → BrowserAction)
 * 3. Imports external data as structured notes (scraped data → Notes)
 */
export interface Skill {
    /** Unique identifier (e.g., 'indeed-v1', 'github-issues-v1') */
    id: string;

    /** Human-readable name */
    name: string;

    /** Description of what this skill does */
    description: string;

    /** Version string */
    version: string;

    /** Semantic patterns this skill recognizes from the ontology */
    patterns: PropertyPattern[];

    /**
     * Check if this skill can handle the given note.
     * Returns a confidence score (0.0 - 1.0).
     *
     * @param note - Note to evaluate
     * @returns Confidence score (0 = cannot handle, 1 = perfect match)
     */
    canHandle(note: Note): number;

    /**
     * Export a note to external actions.
     * Translates semantic note properties into concrete browser/API actions.
     *
     * @param note - Source note to export
     * @returns Action sequence to execute
     */
    exportToActions(note: Note): ActionSequence;

    /**
     * Import scraped/API data as structured notes.
     * Translates external data into semantic notes with proper ontology structure.
     *
     * @param data - Raw data from scraping/API
     * @param sourceNote - Original note that triggered the import
     * @returns Array of imported notes
     */
    importFromData(data: unknown, sourceNote: Note): Note[];

    /**
     * Optional: Skills can provide a preview of what will happen.
     * Used for user confirmation before executing actions.
     *
     * @param note - Note to preview
     * @returns Human-readable preview
     */
    preview?(note: Note): string;
}

/**
 * SkillMetadata provides additional context about a skill.
 */
export interface SkillMetadata {
    skill: Skill;

    /** Tags for categorization */
    tags: string[];

    /** External domains this skill interacts with */
    domains: string[]; // e.g., ['indeed.com', 'linkedin.com']

    /** Whether skill requires authentication */
    requiresAuth: boolean;

    /** Author/maintainer */
    author?: string;
}
