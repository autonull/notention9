import type { CandidateStrategy } from '../spec/index.js';
import type { GateResult } from '../gates.js';

export function runA11yGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for ARIA attributes
    if (!candidate.code.includes('aria-')) {
        warnings.push('No ARIA attributes found - ensure accessibility');
    }

    // Check for role attributes
    if (!candidate.code.includes('role=')) {
        warnings.push('No role attributes found');
    }

    // Check for label associations
    const hasLabel = candidate.code.includes('<label') || candidate.code.includes('aria-label') || candidate.code.includes('aria-labelledby');
    if (!hasLabel) {
        warnings.push('No label associations found for form inputs');
    }

    // Check for alt text on images
    if (candidate.code.includes('<img') && !candidate.code.includes('alt=')) {
        errors.push('Image missing alt attribute');
    }

    return { pass: errors.length === 0, errors, warnings };
}