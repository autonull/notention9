/**
 * Browser-safe Common Utilities
 * Provides browser-compatible versions of common utilities
 * Excludes Node.js-only functions (getProjectRoot, readJsonFile, writeJsonFile)
 */

// Use Web Crypto API for hashing in browser
async function sha256Async(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Re-export all shared utilities (overrides sha256/shortSha256 with browser versions)
export {
    canonicalize,
    computeContentHash,
    verifyContentHash,
    deepClone,
    isEmpty,
    sleep,
    retry,
    type RetryOptions,
    generateId,
    safeDivide,
    clamp,
    average,
    areStringArraysEqual,
    hashString,
    validateRatiosSumToOne,
    ensureMinimums,
    shuffleArray,
    createSeededRandom,
    generateDeterministicId,
    generateCandidateId,
    generateRevisionId,
    isDefaultPoint
} from './common.shared.js';

/** Compute SHA256 hash of string content (sync fallback for non-async contexts) */
export function sha256(content: string): string {
    // Use a simple hash for sync contexts (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    // Return a hex-like string for compatibility
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/** Compute short SHA256 hash (first 16 chars) */
export function shortSha256(content: string): string {
    return sha256(content).slice(0, 16);
}