import type { CandidateStrategy } from '../StrategySpec.js';
import type { GateResult } from '../gates.js';

export function runMustWinGate(candidate: CandidateStrategy): GateResult {
    // Placeholder - must-win requires baseline comparison which is done in evaluation phase
    return { pass: true, errors: [], warnings: ['Must-win requires baseline comparison'] };
}