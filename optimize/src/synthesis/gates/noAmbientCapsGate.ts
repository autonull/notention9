import type { CandidateStrategy } from '../StrategySpec.js';
import type { GateResult } from '../gates.js';

export function runNoAmbientCapsGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const forbiddenPatterns = [
        /\beval\s*\(/,
        /\bFunction\s*\(/,
        /\bfetch\s*\(/,
        /\bXMLHttpRequest/,
        /\blocalStorage\./,
        /\bsessionStorage\./,
        /\bindexedDB\./,
        /\bwindow\./,
        /\bdocument\./,
        /\bnavigator\./,
        /\bcrypto\.randomUUID/,
        /\brequire\s*\(/,
        /import\s*\(/,
    ];

    for (const pattern of forbiddenPatterns) {
        if (pattern.test(candidate.code)) {
            errors.push(`Forbidden ambient capability detected: ${pattern.source}`);
        }
    }

    return { pass: errors.length === 0, errors, warnings };
}