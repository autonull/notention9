/**
 * Core Feature Flags and Configuration
 * 
 * Defines which subsystems are active in the current environment.
 * Can be overridden by environment variables.
 */

export const CORE_FEATURES = {
    NOTES: true,              // Note CRUD operations
    PROPERTIES: true,         // Semantic property parsing
    MATCHING: true,           // Local note matching
    NOSTR: true,              // P2P publishing
    STORAGE: true,            // LocalForage persistence
} as const;

export const OPTIONAL_FEATURES = {
    SKILLS: false,            // External automation (Indeed, GitHub, etc.)
    AGENT: false,             // VoltAgent automation
    LLM_SUGGESTIONS: false,   // AI-powered property extraction
    ONTOLOGY_TOOLS: false,    // Developer Graph/Debugger views
    COLLABORATION: false,     // Real-time multi-user editing
    ADVANCED_SEARCH: false,   // Full-text search, filters
} as const;

/**
 * Gets the effective state of a feature flag, allowing env var overrides.
 * 
 * Env var format: VITE_ENABLE_[FEATURE_NAME]
 * Example: VITE_ENABLE_SKILLS=true
 */
export function getFeatureFlag(key: keyof typeof OPTIONAL_FEATURES): boolean {
    // If running in a browser environment (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        const envKey = `VITE_ENABLE_${key}`;
        const envValue = (import.meta as any).env[envKey];

        if (envValue === 'true') return true;
        if (envValue === 'false') return false;
    }

    return OPTIONAL_FEATURES[key];
}

export function isFeatureEnabled(key: keyof typeof OPTIONAL_FEATURES): boolean {
    return getFeatureFlag(key);
}
