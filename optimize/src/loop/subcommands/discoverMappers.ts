/**
 * Mappers for discover subcommand - converts internal types to serializable artifacts
 */

import type { ComponentInfo, Seam, DiscoveryAnalysis, DuplicateGroup, DeadComponent, InlinedCandidate, GoldenCase } from '@notention/optimize/discovery';

export function mapComponents(components: ComponentInfo[]): Array<{ name: string; file: string; props: Array<{ name: string; type: string; optional: boolean }> }> {
    return components.map(c => ({ name: c.name, file: c.file, props: c.props }));
}

export function mapSeams(seams: Seam[]): Array<{ id: string; name: string; role: string; components: string[]; propsShape: Record<string, string> }> {
    return seams.map(s => ({ id: s.id, name: s.name, role: s.role, components: s.components, propsShape: s.propsShape }));
}

export function mapDuplicateGroup(group: DuplicateGroup): { signature: string; primary: string; duplicates: string[]; reason: string } {
    return {
        signature: group.signature,
        primary: group.primary,
        duplicates: group.duplicates,
        reason: group.reason,
    };
}

export function mapDeadComponent(dead: DeadComponent): { component: string; reason: string; confidence: number } {
    return {
        component: dead.component.name,
        reason: dead.reason,
        confidence: dead.confidence,
    };
}

export function mapInlinedCandidate(inline: InlinedCandidate): { component: string; reason: string; suggestedAction: string } {
    return {
        component: inline.component.name,
        reason: inline.reason,
        suggestedAction: inline.suggestedAction,
    };
}

export function mapDuplicateAnalysis(analysis: DiscoveryAnalysis): {
    duplicateGroups: Array<{ signature: string; primary: string; duplicates: string[]; reason: string }>;
    deadComponents: Array<{ component: string; reason: string; confidence: number }>;
    inlinedCandidates: Array<{ component: string; reason: string; suggestedAction: string }>;
    summary: DiscoveryAnalysis['summary'];
} {
    return {
        duplicateGroups: analysis.duplicateGroups.map(mapDuplicateGroup),
        deadComponents: analysis.deadComponents.map(mapDeadComponent),
        inlinedCandidates: analysis.inlinedCandidates.map(mapInlinedCandidate),
        summary: analysis.summary,
    };
}

export function mapGoldenCase(gc: GoldenCase): {
    name: string;
    input: string;
    expected: unknown;
    forbidden: unknown;
    expectedOutcome: unknown;
    metadata: unknown;
} {
    return {
        name: gc.name,
        input: gc.input,
        expected: gc.expected,
        forbidden: gc.forbidden,
        expectedOutcome: gc.expectedOutcome,
        metadata: gc.metadata,
    };
}