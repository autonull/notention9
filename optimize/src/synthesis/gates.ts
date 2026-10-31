import type { CandidateStrategy, CandidateDir, Seam } from './StrategySpec.js';

export interface GateResult {
    pass: boolean;
    errors: string[];
    warnings: string[];
}

export interface GateReport {
    candidateId: string;
    gates: Record<string, GateResult>;
    overallPass: boolean;
}

import { runTypeScriptGate } from './gates/typeScriptGate.js';
import { runESLintGate } from './gates/eslintGate.js';
import { runSeamConformanceGate } from './gates/seamConformanceGate.js';
import { runImportAllowlistGate } from './gates/importAllowlistGate.js';
import { runNoAmbientCapsGate } from './gates/noAmbientCapsGate.js';
import { runSpecValidationGate } from './gates/specValidationGate.js';
import { runA11yGate } from './gates/a11yGate.js';
import { runKeyboardGate } from './gates/keyboardGate.js';
import { runMustWinGate } from './gates/mustWinGate.js';

/**
 * Run all static gates on a candidate strategy
 */
export async function runStaticGates(
    candidate: CandidateStrategy,
    seams: Seam[]
): Promise<GateReport> {
    const gates: Record<string, GateResult> = {};

    // Gate 1: TypeScript compilation
    gates.typescript = await runTypeScriptGate(candidate);

    // Gate 2: ESLint
    gates.eslint = await runESLintGate(candidate);

    // Gate 3: Seam conformance
    gates.seamConformance = runSeamConformanceGate(candidate, seams);

    // Gate 4: Import allowlist
    gates.importAllowlist = runImportAllowlistGate(candidate);

    // Gate 5: No ambient capabilities
    gates.noAmbientCaps = runNoAmbientCapsGate(candidate);

    // Gate 6: Spec validation
    gates.specValidation = runSpecValidationGate(candidate);

    // Gate 7: A11y
    gates.a11y = runA11yGate(candidate);

    // Gate 8: Keyboard navigation
    gates.keyboard = runKeyboardGate(candidate);

    // Gate 9: Must-win (placeholder - needs comparison)
    gates.mustWin = runMustWinGate(candidate);

    const overallPass = Object.values(gates).every(g => g.pass);

    return {
        candidateId: candidate.id,
        gates,
        overallPass,
    };
}

/**
 * Run gates on all candidates in a directory
 */
export async function runGatesOnCandidateDir(
    dir: CandidateDir,
    seams: Seam[]
): Promise<GateReport[]> {
    const reports: GateReport[] = [];

    for (const candidate of dir.candidates.values()) {
        const report = await runStaticGates(candidate, seams);
        reports.push(report);
    }

    return reports;
}