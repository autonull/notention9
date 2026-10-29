import type { ComponentInfo } from './componentScanner.js';

export interface Seam {
    id: string;
    name: string;
    description: string;
    propsShape: Record<string, string>;
    components: string[];
    role: 'capture' | 'elicit' | 'match' | 'display' | 'layout' | 'explain' | 'ontology' | 'intent';
}

interface PropSignature {
    name: string;
    type: string;
    optional: boolean;
}

function getPropSignature(component: ComponentInfo): PropSignature[] {
    return component.props.map(p => ({
        name: p.name,
        type: p.type,
        optional: p.optional,
    }));
}

function signatureKey(sig: PropSignature[]): string {
    return sig.map(p => `${p.name}:${p.type}${p.optional ? '?' : ''}`).sort().join('|');
}

function clusterBySignature(components: ComponentInfo[]): Map<string, ComponentInfo[]> {
    const clusters = new Map<string, ComponentInfo[]>();
    for (const comp of components) {
        const sig = getPropSignature(comp);
        if (sig.length === 0) continue;
        const key = signatureKey(sig);
        if (!clusters.has(key)) clusters.set(key, []);
        clusters.get(key)!.push(comp);
    }
    return clusters;
}

function inferSeamRole(components: ComponentInfo[], signature: PropSignature[]): Seam['role'] {
    const names = components.map(c => c.name.toLowerCase());
    const props = signature.map(p => p.name.toLowerCase());

    // Capture seam: components with onSubmit, onSave, value, placeholder
    if (props.some(p => ['onsubmit', 'onsave', 'onchange', 'value', 'placeholder'].includes(p))) {
        return 'capture';
    }

    // Elicit/Detail: components asking for more details
    if (props.some(p => ['fields', 'schema', 'required', 'missing'].includes(p)) ||
        names.some(n => n.includes('elicit') || n.includes('detail') || n.includes('insert'))) {
        return 'elicit';
    }

    // Match: components showing matches, previews
    if (names.some(n => n.includes('match') || n.includes('preview') || n.includes('result'))) {
        return 'match';
    }

    // Display: components rendering notes, lists
    if (names.some(n => n.includes('note') || n.includes('list') || n.includes('card') || n.includes('dashboard'))) {
        return 'display';
    }

    // Layout: components controlling layout
    if (names.some(n => n.includes('layout') || n.includes('pane') || n.includes('view'))) {
        return 'layout';
    }

    // Explain: components showing explanations
    if (names.some(n => n.includes('explain') || n.includes('why') || n.includes('reason'))) {
        return 'explain';
    }

    // Ontology: components browsing ontology
    if (names.some(n => n.includes('ontology') || n.includes('taxonomy') || n.includes('property'))) {
        return 'ontology';
    }

    // Intent: components for commitments, deadlines
    if (names.some(n => n.includes('intent') || n.includes('commit') || n.includes('deadline') || n.includes('status'))) {
        return 'intent';
    }

    return 'display'; // default
}

function generateSeamId(role: Seam['role'], index: number): string {
    return `${role}-${index}`;
}

export function discoverSeams(components: ComponentInfo[]): Seam[] {
    const clusters = clusterBySignature(components);
    const seams: Seam[] = [];

    let roleIndex: Record<Seam['role'], number> = {
        capture: 0,
        elicit: 0,
        match: 0,
        display: 0,
        layout: 0,
        explain: 0,
        ontology: 0,
        intent: 0,
    };

    for (const [signatureKey, comps] of clusters) {
        if (comps.length === 0) continue;

        const signature = comps[0].props.map(p => ({ name: p.name, type: p.type, optional: p.optional }));
        const role = inferSeamRole(comps, signature);

        seams.push({
            id: generateSeamId(role, roleIndex[role]++),
            name: `${role} (${signatureKey})`,
            description: `Auto-discovered ${role} seam with ${comps.length} component(s)`,
            propsShape: Object.fromEntries(signature.map(p => [p.name, `${p.type}${p.optional ? '?' : ''}`])),
            components: comps.map(c => c.name),
            role,
        });
    }

    // Merge seams with same role if they have similar signatures
    const merged = mergeSimilarSeams(seams);
    return merged;
}

function mergeSimilarSeams(seams: Seam[]): Seam[] {
    const byRole = new Map<Seam['role'], Seam[]>();
    for (const seam of seams) {
        if (!byRole.has(seam.role)) byRole.set(seam.role, []);
        byRole.get(seam.role)!.push(seam);
    }

    const merged: Seam[] = [];
    for (const [role, roleSeams] of byRole) {
        if (roleSeams.length === 1) {
            merged.push(roleSeams[0]);
            continue;
        }

        // For now, just pick the largest cluster per role
        const largest = roleSeams.reduce((a, b) => a.components.length > b.components.length ? a : b);
        largest.name = `${role} (merged ${roleSeams.length} clusters)`;
        largest.description = `Merged ${roleSeams.length} auto-discovered ${role} seams, ${largest.components.length} components`;
        merged.push(largest);
    }

    return merged;
}