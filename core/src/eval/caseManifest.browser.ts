/**
 * Browser-safe stub for caseManifest
 * Evaluation infrastructure is Node.js only
 */

export function generateManifest(): never {
    throw new Error('generateManifest is only available in Node.js');
}

export function writeManifest(): never {
    throw new Error('writeManifest is only available in Node.js');
}

export function readManifest(): never {
    throw new Error('readManifest is only available in Node.js');
}

export function verifyManifest(): never {
    throw new Error('verifyManifest is only available in Node.js');
}

export function readIntentCases(): never {
    throw new Error('readIntentCases is only available in Node.js');
}

export function readQualityCases(): never {
    throw new Error('readQualityCases is only available in Node.js');
}

export function readHoldoutCases(): never {
    throw new Error('readHoldoutCases is only available in Node.js');
}

export function readAllCases(): never {
    throw new Error('readAllCases is only available in Node.js');
}

// Types are still exported for type checking
export type { CaseManifest, CaseEntry, IntentCase, QualityCase, ExtractionExpectation, MatchExpectation } from './caseManifest.js';