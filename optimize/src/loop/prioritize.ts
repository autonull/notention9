import type { Seam } from '@notention/optimize/discovery';
import {
    RECOVERABILITY_WEIGHTS,
    DEFAULT_VARIATION_THRESHOLDS,
    DEFAULT_MIN_EVIDENCE_FOR_DECISION,
    DEFAULT_PROBLEM_VALUES,
    PROBLEM_SEVERITY_DEFAULTS,
    PROBLEM_RECOVERABILITY_DEFAULTS,
    PROBLEM_REACH_DEFAULTS,
    EXPECTED_SEAM_ROLES,
    COMPLEXITY_WEIGHTS,
    MISSING_SEAM_FREQUENCY,
} from './prioritizeConstants.js';
import { getFrictionCounts, type FrictionKind } from '@notention/core/telemetry/journal';
import {
    FRICTION_TO_SEAM_MAP,
    emptyKindCounts,
    thresholdKeyFor,
} from './frictionMap.js';

export interface DiscoveredProblem {
    id: string;
    type: 'failed-match' | 'repeated-correction' | 'abandoned-task' | 'opt-in-feedback' | 'duplicate-component' | 'dead-component' | 'inline-candidate';
    description: string;
    seamId?: string;
    component?: string;
    frequency: number;
    severity: number;      // 1-5
    recoverability: number; // 1-5 (5 = easily recoverable)
    reach: number;         // 1-5 (number of workflows/users affected)
    evidence: string[];
}

export interface PrioritizedProblem extends DiscoveredProblem {
    impactScore: number;   // frequency × severity × (6 - recoverability) × reach
    rank: number;
}

export function calculateImpactScore(problem: DiscoveredProblem): number {
    const recoverabilityFactor = RECOVERABILITY_WEIGHTS[problem.recoverability as keyof typeof RECOVERABILITY_WEIGHTS] ?? 3;
    return problem.frequency * problem.severity * recoverabilityFactor * problem.reach;
}

export function prioritizeProblems(problems: DiscoveredProblem[]): PrioritizedProblem[] {
    const scored = problems.map(p => ({
        ...p,
        impactScore: calculateImpactScore(p),
    }));

    scored.sort((a, b) => b.impactScore - a.impactScore);

    return scored.map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * Failure signal capture (O5) - captures signals from app usage
 */
export interface FailureSignal {
    type: 'failed-match' | 'repeated-correction' | 'abandoned-task' | 'opt-in-feedback';
    timestamp: string;
    context: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
}

export interface FailureSignalStore {
    signals: FailureSignal[];
    record(signal: FailureSignal): void;
    getSignals(filter?: { type?: FailureSignal['type']; since?: string }): FailureSignal[];
    clear(): void;
}

export function createFailureSignalStore(): FailureSignalStore {
    const signals: FailureSignal[] = [];
    return {
        signals,
        record(signal: FailureSignal) {
            signals.push(signal);
        },
        getSignals(filter) {
            return signals.filter(s => {
                if (filter?.type && s.type !== filter.type) return false;
                if (filter?.since && s.timestamp < filter.since) return false;
                return true;
            });
        },
        clear() {
            signals.length = 0;
        },
    };
}

/**
 * Failure vs legitimate variation discrimination (O6)
 * Requires repeated patterns (threshold) before treating variation as failure
 */
export interface VariationThresholds {
    failedMatch: number;      // Minimum failed matches before flagging
    repeatedCorrection: number; // Minimum corrections before flagging
    abandonedTask: number;    // Minimum abandoned tasks before flagging
}

export function isFailureNotVariation(
    signalCount: number,
    signalType: FailureSignal['type'],
    thresholds: VariationThresholds = DEFAULT_VARIATION_THRESHOLDS
): boolean {
    switch (signalType) {
        case 'failed-match':
            return signalCount >= thresholds.failedMatch;
        case 'repeated-correction':
            return signalCount >= thresholds.repeatedCorrection;
        case 'abandoned-task':
            return signalCount >= thresholds.abandonedTask;
        case 'opt-in-feedback':
            return true; // Explicit feedback is always a signal
        default:
            return false;
    }
}

/**
 * Abstention on insufficient evidence (O7)
 */
export interface AbstentionDecision {
    shouldAbstain: boolean;
    reason: string;
    evidenceCount: number;
    minimumRequired: number;
}

export function checkAbstention(
    evidenceCount: number,
    minimumRequired: number = DEFAULT_MIN_EVIDENCE_FOR_DECISION
): AbstentionDecision {
    if (evidenceCount < minimumRequired) {
        return {
            shouldAbstain: true,
            reason: `Insufficient evidence: ${evidenceCount} signals, minimum ${minimumRequired} required`,
            evidenceCount,
            minimumRequired,
        };
    }
    return {
        shouldAbstain: false,
        reason: 'Sufficient evidence for decision',
        evidenceCount,
        minimumRequired,
    };
}

/**
 * Smallest-change preference (O8) - tracks complexity delta
 */
export interface ComplexityDelta {
    linesAdded: number;
    linesRemoved: number;
    newDependencies: string[];
    newFiles: number;
    modifiedFiles: number;
    complexityScore: number; // Weighted score
}

export function calculateComplexityDelta(
    baseline: { files: number; lines: number; deps: string[] },
    candidate: { files: number; lines: number; deps: string[] }
): ComplexityDelta {
    const linesAdded = Math.max(0, candidate.lines - baseline.lines);
    const linesRemoved = Math.max(0, baseline.lines - candidate.lines);
    const newDeps = candidate.deps.filter(d => !baseline.deps.includes(d));
    const newFiles = Math.max(0, candidate.files - baseline.files);
    const modifiedFiles = Math.min(baseline.files, candidate.files);

    // Weighted complexity score
    const complexityScore =
        linesAdded * COMPLEXITY_WEIGHTS.linesAdded +
        linesRemoved * COMPLEXITY_WEIGHTS.linesRemoved +
        newDeps.length * COMPLEXITY_WEIGHTS.newDependency +
        newFiles * COMPLEXITY_WEIGHTS.newFile +
        modifiedFiles * COMPLEXITY_WEIGHTS.modifiedFile;

    return {
        linesAdded,
        linesRemoved,
        newDependencies: newDeps,
        newFiles,
        modifiedFiles,
        complexityScore,
    };
}

/**
 * Helper to create a discovered problem with common fields
 */
function createProblem(
    id: string,
    type: DiscoveredProblem['type'],
    description: string,
    options: Partial<DiscoveredProblem> = {}
): DiscoveredProblem {
    return {
        id,
        type,
        description,
        ...DEFAULT_PROBLEM_VALUES,
        severity: PROBLEM_SEVERITY_DEFAULTS[type] ?? DEFAULT_PROBLEM_VALUES.severity,
        recoverability: PROBLEM_RECOVERABILITY_DEFAULTS[type] ?? DEFAULT_PROBLEM_VALUES.recoverability,
        reach: PROBLEM_REACH_DEFAULTS[type] ?? DEFAULT_PROBLEM_VALUES.reach,
        ...options,
    };
}

export function deriveProblemsFromDiscovery(
    discovered: {
        duplicateAnalysis: {
            duplicateGroups: Array<{ signature: string; primary: string; duplicates: string[]; reason: string }>;
            deadComponents: Array<{ component: string; reason: string; confidence: number }>;
            inlinedCandidates: Array<{ component: string; reason: string; suggestedAction: string }>;
        };
        seams: Seam[];
        components: Array<{ name: string; file: string; props: Array<{ name: string; type: string; optional: boolean }> }>;
    }
): DiscoveredProblem[] {
    const problems: DiscoveredProblem[] = [];

    // Duplicate components
    for (const group of discovered.duplicateAnalysis.duplicateGroups) {
        problems.push(createProblem(
            `duplicate-${group.signature.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            'duplicate-component',
            `Duplicate component group: ${group.primary} and ${group.duplicates.length} duplicates (${group.reason})`,
            {
                component: group.primary,
                frequency: group.duplicates.length + 1,
                evidence: [`Primary: ${group.primary}`, `Duplicates: ${group.duplicates.join(', ')}`, `Reason: ${group.reason}`],
            }
        ));
    }

    // Dead components
    for (const dead of discovered.duplicateAnalysis.deadComponents) {
        problems.push(createProblem(
            `dead-${dead.component.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            'dead-component',
            `Dead component: ${dead.component} (${dead.reason})`,
            {
                component: dead.component,
                evidence: [`Reason: ${dead.reason}`, `Confidence: ${dead.confidence}`],
            }
        ));
    }

    // Inlined candidates
    for (const inline of discovered.duplicateAnalysis.inlinedCandidates) {
        problems.push(createProblem(
            `inline-${inline.component.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            'inline-candidate',
            `Inlined component: ${inline.component} (${inline.reason}) - ${inline.suggestedAction}`,
            {
                component: inline.component,
                evidence: [`Reason: ${inline.reason}`, `Suggested: ${inline.suggestedAction}`],
            }
        ));
    }

    // Missing seams for key roles
    const foundRoles = new Set(discovered.seams.map(s => s.role));

    for (const role of EXPECTED_SEAM_ROLES) {
        if (!foundRoles.has(role)) {
            problems.push(createProblem(
                `missing-seam-${role}`,
                'failed-match',
                `Missing seam for role: ${role}`,
                {
                    seamId: role,
                    frequency: MISSING_SEAM_FREQUENCY,
                    evidence: [`No components found for ${role} seam`],
                }
            ));
        }
    }

    return problems;
}

/**
 * Mapping from friction kinds to seam roles and candidate parameter hypotheses
 * Based on TODO.14 B3.2 - friction kinds → seam/param hypotheses
 */
export type { FrictionToSeamMapping } from './frictionMap.js';
export { FRICTION_TO_SEAM_MAP, NON_PROBLEM_FRICTION_KINDS } from './frictionMap.js';

/**
 * Derive problems from friction journal signals
 * Maps friction kinds to seam/param hypotheses with provenance
 */
export function deriveProblemsFromFriction(since?: string): DiscoveredProblem[] {
    const frictionCounts = getFrictionCounts(since);
    const problems: DiscoveredProblem[] = [];

    for (const { kind, count, halfLifeWeightedCount } of frictionCounts) {
        const mapping = FRICTION_TO_SEAM_MAP[kind as FrictionKind];
        if (!mapping) continue;

        // Positive/neutral signals never become problems.
        const thresholdKey = thresholdKeyFor(kind as FrictionKind);
        if (!thresholdKey) continue;

        // Apply variation threshold (O6) - require repeated patterns
        const threshold = DEFAULT_VARIATION_THRESHOLDS[thresholdKey] ?? 3;

        if (count < threshold) continue; // Not enough evidence yet

        const id = `friction-${kind}-${mapping.seamRole}`;
        problems.push(createProblem(
            id,
            mapping.problemType,
            `Friction: ${kind} (${count}×, weight ${halfLifeWeightedCount.toFixed(2)}) → ${mapping.seamRole} seam params: ${mapping.paramHypotheses.join(', ')}`,
            {
                seamId: mapping.seamRole,
                frequency: count,
                severity: Math.min(5, Math.max(2, Math.floor(halfLifeWeightedCount / 2) + 2)),
                recoverability: 3,
                reach: 4,
                evidence: [
                    `Friction kind: ${kind}`,
                    `Count: ${count}`,
                    `Half-life weighted count: ${halfLifeWeightedCount.toFixed(2)}`,
                    `Affected seam: ${mapping.seamRole}`,
                    `Candidate params: ${mapping.paramHypotheses.join(', ')}`,
                    `Provenance: observed/journal`,
                ],
            }
        ));
    }

    return problems;
}

/**
 * Create candidate hypothesis template with provenance
 * Each friction-driven candidate carries provenance: {class: 'observed', source: 'journal', kinds, counts}
 */
export interface CandidateHypothesis {
    id: string;
    seamRole: string;
    paramHypotheses: string[];
    provenance: {
        class: 'observed' | 'hypothesized' | 'measured' | 'asserted';
        source: 'journal' | 'simulator' | 'human' | 'model';
        kinds: FrictionKind[];
        counts: Record<FrictionKind, number>;
    };
    description: string;
    priority: number; // Higher = more urgent
}

export function createCandidateHypothesesFromFriction(since?: string): CandidateHypothesis[] {
    const frictionCounts = getFrictionCounts(since);
    const hypotheses: CandidateHypothesis[] = [];

    const kindCounts = emptyKindCounts();

    for (const { kind, count, halfLifeWeightedCount } of frictionCounts) {
        kindCounts[kind as FrictionKind] = count;

        const mapping = FRICTION_TO_SEAM_MAP[kind as FrictionKind];
        if (!mapping) continue;

        const thresholdKey = thresholdKeyFor(kind as FrictionKind);
        if (!thresholdKey) continue;

        const threshold = DEFAULT_VARIATION_THRESHOLDS[thresholdKey] ?? 3;

        if (count < threshold) continue;

        hypotheses.push({
            id: `hyp-${kind}-${mapping.seamRole}-${Date.now()}`,
            seamRole: mapping.seamRole,
            paramHypotheses: mapping.paramHypotheses,
            provenance: {
                class: 'observed',
                source: 'journal',
                kinds: [kind as FrictionKind],
                counts: kindCounts,
            },
            description: `Observed friction: ${kind} (${count}×). Investigate ${mapping.seamRole} seam params: ${mapping.paramHypotheses.join(', ')}`,
            priority: Math.floor(halfLifeWeightedCount * 10),
        });
    }

    return hypotheses.sort((a, b) => b.priority - a.priority);
}