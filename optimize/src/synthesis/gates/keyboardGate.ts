import type { CandidateStrategy } from '../spec/index.js';
import type { GateResult } from '../gates.js';

export function runKeyboardGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for tabIndex or focusable elements
    const hasFocusable = candidate.code.includes('tabIndex') ||
                         candidate.code.includes('onKeyDown') ||
                         candidate.code.includes('onKeyUp') ||
                         candidate.code.includes('onKeyPress');

    if (!hasFocusable) {
        warnings.push('No keyboard event handlers found - ensure keyboard navigability');
    }

    // Check for focus management
    if (!candidate.code.includes('focus()') && !candidate.code.includes('autoFocus')) {
        warnings.push('No explicit focus management found');
    }

    return { pass: errors.length === 0, errors, warnings };
}