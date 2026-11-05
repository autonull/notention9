import type { CandidateStrategy } from '../spec/index.js';
import type { GateResult } from '../gates.js';
import { validateStrategySpec } from '../spec/index.js';

export function runSpecValidationGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        validateStrategySpec(candidate.spec);
    } catch (e) {
        errors.push(`Spec validation failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Additional checks
    if (!candidate.spec.must || candidate.spec.must.length === 0) {
        warnings.push('No "must" requirements specified');
    }
    if (!candidate.spec.mustNot || candidate.spec.mustNot.length === 0) {
        warnings.push('No "mustNot" restrictions specified');
    }

    return { pass: errors.length === 0, errors, warnings };
}