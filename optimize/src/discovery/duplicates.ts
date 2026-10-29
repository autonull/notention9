import type { ComponentInfo } from './componentScanner.js';
import type { Seam } from './seams.js';

export interface DuplicateGroup {
    signature: string;
    components: ComponentInfo[];
    reason: 'identical-props' | 'near-identical-props' | 'identical-jsx' | 'subsumed';
    primary: string;
    duplicates: string[];
}

export interface DeadComponent {
    component: ComponentInfo;
    reason: 'unreferenced' | 'no-jsx-usage' | 'exported-but-unused';
    confidence: number;
}

export interface InlinedCandidate {
    component: ComponentInfo;
    reason: 'single-use' | 'trivial-wrapper' | 'no-props-variation';
    suggestedAction: 'inline' | 'keep';
}

export interface DiscoveryAnalysis {
    duplicateGroups: DuplicateGroup[];
    deadComponents: DeadComponent[];
    inlinedCandidates: InlinedCandidate[];
    summary: {
        totalComponents: number;
        duplicateCount: number;
        deadCount: number;
        inlinedCount: number;
        actionableFindings: number;
    };
}

function getPropSignature(component: ComponentInfo): string {
    return component.props
        .map(p => `${p.name}:${p.type}${p.optional ? '?' : ''}`)
        .sort()
        .join('|');
}

function propsAreIdentical(a: ComponentInfo, b: ComponentInfo): boolean {
    if (a.props.length !== b.props.length) return false;
    for (let i = 0; i < a.props.length; i++) {
        if (a.props[i].name !== b.props[i].name) return false;
        if (a.props[i].type !== b.props[i].type) return false;
        if (a.props[i].optional !== b.props[i].optional) return false;
    }
    return true;
}

function propsAreNearIdentical(a: ComponentInfo, b: ComponentInfo, threshold = 0.8): boolean {
    const allProps = new Set([...a.props.map(p => p.name), ...b.props.map(p => p.name)]);
    let matches = 0;
    for (const propName of allProps) {
        const pa = a.props.find(p => p.name === propName);
        const pb = b.props.find(p => p.name === propName);
        if (pa && pb && pa.type === pb.type && pa.optional === pb.optional) {
            matches++;
        }
    }
    return matches / allProps.size >= threshold;
}

function findJSXReferences(componentName: string, sourceDirs: string[]): number {
    // This would need a proper JSX scanner - for now return a heuristic
    // In a real implementation, this would scan all .tsx files for <ComponentName usage
    return 0; // placeholder
}

export async function analyzeDuplicates(
    components: ComponentInfo[],
    _seams: Seam[]
): Promise<DiscoveryAnalysis> {
    // Filter to only components with props for duplicate analysis
    const componentsWithProps = components.filter(c => c.props.length > 0);
    
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    // Find identical and near-identical prop signatures
    for (let i = 0; i < componentsWithProps.length; i++) {
        if (processed.has(componentsWithProps[i].name)) continue;

        const group: ComponentInfo[] = [componentsWithProps[i]];
        processed.add(componentsWithProps[i].name);

        for (let j = i + 1; j < componentsWithProps.length; j++) {
            if (processed.has(componentsWithProps[j].name)) continue;

            if (propsAreIdentical(componentsWithProps[i], componentsWithProps[j])) {
                group.push(componentsWithProps[j]);
                processed.add(componentsWithProps[j].name);
            } else if (propsAreNearIdentical(componentsWithProps[i], componentsWithProps[j])) {
                group.push(componentsWithProps[j]);
                processed.add(componentsWithProps[j].name);
            }
        }

        if (group.length > 1) {
            const primary = group[0].name;
            duplicateGroups.push({
                signature: getPropSignature(group[0]),
                components: group,
                reason: group.every(c => propsAreIdentical(group[0], c)) ? 'identical-props' : 'near-identical-props',
                primary,
                duplicates: group.slice(1).map(c => c.name),
            });
        }
    }

    // Find dead components (heuristic: components with no clear usage)
    const deadComponents: DeadComponent[] = [];
    for (const comp of components) {
        // Heuristic: components with very generic names that might be dead
        // In real implementation, this would scan JSX usage
        if (comp.name.match(/^(Test|Debug|Temp|Old|Deprecated|Unused)/i)) {
            deadComponents.push({
                component: comp,
                reason: 'no-jsx-usage',
                confidence: 0.7,
            });
        }
    }

    // Find inlined candidates
    const inlinedCandidates: InlinedCandidate[] = [];
    for (const comp of components) {
        // Single-use components with trivial props
        const jsxRefs = findJSXReferences(comp.name, []);
        if (jsxRefs === 1 && comp.props.length <= 2) {
            inlinedCandidates.push({
                component: comp,
                reason: 'single-use',
                suggestedAction: 'inline',
            });
        } else if (comp.props.length === 0 && comp.name.match(/^(Wrapper|Container|Provider)$/i)) {
            inlinedCandidates.push({
                component: comp,
                reason: 'trivial-wrapper',
                suggestedAction: 'inline',
            });
        }
    }

    const actionableFindings = duplicateGroups.length + deadComponents.filter(d => d.confidence > 0.5).length + inlinedCandidates.filter(i => i.suggestedAction === 'inline').length;

    return {
        duplicateGroups,
        deadComponents,
        inlinedCandidates,
        summary: {
            totalComponents: components.length,
            duplicateCount: duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0),
            deadCount: deadComponents.filter(d => d.confidence > 0.5).length,
            inlinedCount: inlinedCandidates.filter(i => i.suggestedAction === 'inline').length,
            actionableFindings,
        },
    };
}