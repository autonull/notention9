import type { Seam } from '../discovery/seams.js';

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

const RECOVERABILITY_WEIGHTS = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 }; // Lower recoverability = higher impact

export function calculateImpactScore(problem: DiscoveredProblem): number {
    const recoverabilityFactor = RECOVERABILITY_WEIGHTS[problem.recoverability as keyof typeof RECOVERABILITY_WEIGHTS] || 3;
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

export const DEFAULT_VARIATION_THRESHOLDS: VariationThresholds = {
    failedMatch: 3,
    repeatedCorrection: 3,
    abandonedTask: 2,
};

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
    minimumRequired: number = 3
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
        linesAdded * 0.1 +
        linesRemoved * 0.05 +
        newDeps.length * 5 +
        newFiles * 10 +
        modifiedFiles * 1;

    return {
        linesAdded,
        linesRemoved,
        newDependencies: newDeps,
        newFiles,
        modifiedFiles,
        complexityScore,
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
        problems.push({
            id: `duplicate-${group.signature.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            type: 'duplicate-component',
            description: `Duplicate component group: ${group.primary} and ${group.duplicates.length} duplicates (${group.reason})`,
            component: group.primary,
            frequency: group.duplicates.length + 1,
            severity: 3,
            recoverability: 4, // Easy to deduplicate
            reach: 2,
            evidence: [`Primary: ${group.primary}`, `Duplicates: ${group.duplicates.join(', ')}`, `Reason: ${group.reason}`],
        });
    }

    // Dead components
    for (const dead of discovered.duplicateAnalysis.deadComponents) {
        problems.push({
            id: `dead-${dead.component.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            type: 'dead-component',
            description: `Dead component: ${dead.component} (${dead.reason})`,
            component: dead.component,
            frequency: 1,
            severity: 2,
            recoverability: 5, // Easy to remove
            reach: 1,
            evidence: [`Reason: ${dead.reason}`, `Confidence: ${dead.confidence}`],
        });
    }

    // Inlined candidates
    for (const inline of discovered.duplicateAnalysis.inlinedCandidates) {
        problems.push({
            id: `inline-${inline.component.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`,
            type: 'inline-candidate',
            description: `Inlined component: ${inline.component} (${inline.reason}) - ${inline.suggestedAction}`,
            component: inline.component,
            frequency: 1,
            severity: 2,
            recoverability: 3,
            reach: 2,
            evidence: [`Reason: ${inline.reason}`, `Suggested: ${inline.suggestedAction}`],
        });
    }

    // Missing seams for key roles
    const expectedRoles: Array<Seam['role']> = ['capture', 'elicit', 'match', 'display', 'layout', 'explain', 'ontology', 'intent'];
    const foundRoles = new Set(discovered.seams.map(s => s.role));

    for (const role of expectedRoles) {
        if (!foundRoles.has(role)) {
            problems.push({
                id: `missing-seam-${role}`,
                type: 'failed-match',
                description: `Missing seam for role: ${role}`,
                seamId: role,
                frequency: 5, // High frequency - affects all workflows using this role
                severity: 4,
                recoverability: 2, // Hard to recover without the seam
                reach: 5, // Affects all users
                evidence: [`No components found for ${role} seam`],
            });
        }
    }

    return problems;
}