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