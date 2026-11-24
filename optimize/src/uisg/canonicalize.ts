import { createHash } from 'node:crypto';
import type { UisgGraph, UisgNode, UisgEdge, SurfaceVariant } from './types.js';

export const CURRENT_SCHEMA_VERSION = 3;

export interface CanonicalizeOptions {
    schemaVersion: number;
    unknownFieldPolicy: 'preserve' | 'strip' | 'error';
}

export const DEFAULT_CANONICALIZE_OPTIONS: CanonicalizeOptions = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    unknownFieldPolicy: 'preserve',
};

export interface GraphMigration {
    graph: UisgGraph;
    migrated: boolean;
    from: number;
}

export function migrateGraph(graph: UisgGraph): GraphMigration {
    if (graph.version >= CURRENT_SCHEMA_VERSION) return { graph, migrated: false, from: graph.version };
    return {
        graph: {
            ...graph,
            version: CURRENT_SCHEMA_VERSION,
            nodes: graph.nodes.map(node => node.type === 'surface'
                ? { ...node, variants: node.variants ?? {} }
                : node),
        },
        migrated: true,
        from: graph.version,
    };
}

function stableSort<T>(array: T[], keyFn: (item: T) => string): T[] {
    return [...array].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

const COMMON_NODE_FIELDS = ['id', 'name', 'status', 'summary', 'source', 'confidence', 'type'];
const NODE_FIELDS: Record<UisgNode['type'], readonly string[]> = {
    intent: ['actor', 'outcome'],
    capability: ['seam', 'strategy', 'skill', 'risk', 'effect'],
    flow: ['entry', 'outcome', 'journey'],
    step: ['kind', 'target', 'action', 'value', 'statePath', 'stateEquals', 'guard'],
    surface: ['component', 'route', 'configKey', 'seam', 'template', 'propsSchema', 'generatedFrom', 'variants', 'defaultVariant'],
    predicate: ['expression', 'registryId'],
    effect: ['reversibility', 'risk', 'confirmationRequired', 'failureModes', 'registryId'],
};
const EDGE_FIELDS = ['from', 'type', 'to', 'when', 'notes'];
const VARIANT_FIELDS = ['template', 'propsSchema', 'strategyOverrides', 'description', 'status', 'promotedAt', 'metrics'];

function canonicalizeVariant(variant: SurfaceVariant, label: string, options: CanonicalizeOptions): SurfaceVariant {
    return {
        ...unknownFields(variant, VARIANT_FIELDS, label, options),
        template: variant.template ?? undefined,
        propsSchema: variant.propsSchema ?? undefined,
        strategyOverrides: variant.strategyOverrides
            ? Object.fromEntries(Object.entries(variant.strategyOverrides).sort(([a], [b]) => a.localeCompare(b)))
            : undefined,
        description: variant.description,
        status: variant.status,
        promotedAt: variant.promotedAt ?? undefined,
        metrics: variant.metrics ?? undefined,
    };
}

function canonicalizeVariants(variants: Record<string, SurfaceVariant>, label: string, options: CanonicalizeOptions): Record<string, SurfaceVariant> {
    return Object.fromEntries(Object.entries(variants)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, variant]) => [id, canonicalizeVariant(variant, `${label}/${id}`, options)]));
}

function unknownFields(record: object, known: Iterable<string>, label: string, options: CanonicalizeOptions): Record<string, unknown> {
    const knownFields = new Set(known);
    const extra = Object.entries(record).filter(([key, value]) => !knownFields.has(key) && value !== undefined);
    if (!extra.length) return {};
    if (options.unknownFieldPolicy === 'error') {
        throw new Error(`Unknown fields on ${label}: ${extra.map(([key]) => key).sort().join(', ')}`);
    }
    if (options.unknownFieldPolicy === 'strip') return {};
    return Object.fromEntries(extra.sort(([a], [b]) => a.localeCompare(b)));
}

function canonicalizeNode(node: UisgNode, options: CanonicalizeOptions): UisgNode {
    const base = {
        ...unknownFields(node, [...COMMON_NODE_FIELDS, ...NODE_FIELDS[node.type]], node.id, options),
        id: node.id,
        name: node.name,
        status: node.status,
        summary: node.summary ?? undefined,
        source: node.source?.length ? stableSort(node.source, s => s) : undefined,
        confidence: node.confidence ?? undefined,
    };

    switch (node.type) {
        case 'intent':
            return {
                ...base,
                type: 'intent',
                actor: node.actor ?? undefined,
                outcome: node.outcome ?? undefined,
            };
        case 'capability':
            return {
                ...base,
                type: 'capability',
                seam: node.seam ?? undefined,
                strategy: node.strategy ?? undefined,
                skill: node.skill ?? undefined,
                risk: node.risk ?? undefined,
                effect: node.effect ?? undefined,
            };
        case 'flow':
            return {
                ...base,
                type: 'flow',
                entry: node.entry,
                outcome: node.outcome,
                journey: node.journey ?? undefined,
            };
        case 'step':
            return {
                ...base,
                type: 'step',
                kind: node.kind,
                target: node.target ? canonicalizeTarget(node.target) : undefined,
                action: node.action ?? undefined,
                value: node.value ?? undefined,
                statePath: node.statePath ?? undefined,
                stateEquals: node.stateEquals ?? undefined,
                guard: node.guard ?? undefined,
            };
        case 'surface':
            return {
                ...base,
                type: 'surface',
                component: node.component ?? undefined,
                route: node.route ?? undefined,
                configKey: node.configKey ?? undefined,
                seam: node.seam ?? undefined,
                template: node.template ?? undefined,
                propsSchema: node.propsSchema ?? undefined,
                generatedFrom: node.generatedFrom ?? undefined,
                variants: node.variants && Object.keys(node.variants).length
                    ? canonicalizeVariants(node.variants, node.id, options)
                    : undefined,
                defaultVariant: node.defaultVariant ?? undefined,
            };
        case 'predicate':
            return {
                ...base,
                type: 'predicate',
                expression: node.expression,
                registryId: node.registryId,
            };
        case 'effect':
            return {
                ...base,
                type: 'effect',
                reversibility: node.reversibility,
                risk: node.risk,
                confirmationRequired: node.confirmationRequired,
                failureModes: node.failureModes?.length ? stableSort(node.failureModes, s => s) : [],
                registryId: node.registryId,
            };
    }
}

function canonicalizeTarget(target: any): any {
    if ('role' in target) {
        return {
            role: target.role,
            name: target.name,
            exact: target.exact ?? undefined,
            modal: target.modal ?? undefined,
        };
    }
    if ('testId' in target) {
        return {
            testId: target.testId,
            modal: target.modal ?? undefined,
        };
    }
    if ('label' in target) {
        return {
            label: target.label,
            modal: target.modal ?? undefined,
        };
    }
    return target;
}

function canonicalizeEdge(edge: UisgEdge, options: CanonicalizeOptions): UisgEdge {
    return {
        ...unknownFields(edge, EDGE_FIELDS, `${edge.from}->${edge.to}`, options),
        from: edge.from,
        type: edge.type,
        to: edge.to,
        when: edge.when ?? undefined,
        notes: edge.notes ?? undefined,
    };
}

export function canonicalize(graph: UisgGraph, options: CanonicalizeOptions = DEFAULT_CANONICALIZE_OPTIONS): UisgGraph {
    const canonicalNodes = stableSort(graph.nodes.map(node => canonicalizeNode(node, options)), n => n.id);
    const canonicalEdges = stableSort(graph.edges.map(edge => canonicalizeEdge(edge, options)), e => `${e.from}|${e.type}|${e.to}|${e.when ?? ''}`);

    return {
        version: options.schemaVersion,
        nodes: canonicalNodes,
        edges: canonicalEdges,
    };
}

export function graphHash(graph: UisgGraph): string {
    const canonical = canonicalize(graph);
    const json = JSON.stringify(canonical);
    return createHash('sha256').update(json).digest('hex');
}

export function roundTripTest(graph: UisgGraph): boolean {
    const canonical1 = canonicalize(graph);
    const json = JSON.stringify(canonical1);
    const parsed = JSON.parse(json);
    const canonical2 = canonicalize(parsed);
    const json2 = JSON.stringify(canonical2);
    return json === json2;
}

export function diffGraphs(graphA: UisgGraph, graphB: UisgGraph): {
    addedNodes: UisgNode[];
    removedNodes: UisgNode[];
    changedNodes: { before: UisgNode; after: UisgNode }[];
    addedEdges: UisgEdge[];
    removedEdges: UisgEdge[];
    semanticChanges: string[];
} {
    const canonA = canonicalize(graphA);
    const canonB = canonicalize(graphB);

    const nodesA = new Map(canonA.nodes.map(n => [n.id, n]));
    const nodesB = new Map(canonB.nodes.map(n => [n.id, n]));
    const edgesA = new Set(canonA.edges.map(e => `${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));
    const edgesB = new Set(canonB.edges.map(e => `${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));

    const addedNodes = canonB.nodes.filter(n => !nodesA.has(n.id));
    const removedNodes = canonA.nodes.filter(n => !nodesB.has(n.id));
    const changedNodes: { before: UisgNode; after: UisgNode }[] = [];

    for (const node of canonA.nodes) {
        const nodeB = nodesB.get(node.id);
        if (nodeB && JSON.stringify(node) !== JSON.stringify(nodeB)) {
            changedNodes.push({ before: node, after: nodeB });
        }
    }

    const addedEdges = canonB.edges.filter(e => !edgesA.has(`${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));
    const removedEdges = canonA.edges.filter(e => !edgesB.has(`${e.from}|${e.type}|${e.to}|${e.when ?? ''}`));

    const semanticChanges: string[] = [];
    for (const { before, after } of changedNodes) {
        if (before.status !== after.status) {
            semanticChanges.push(`Node ${before.id}: status ${before.status} -> ${after.status}`);
        }
        if (before.type === 'flow' && after.type === 'flow') {
            if (before.journey !== after.journey) {
                semanticChanges.push(`Flow ${before.id}: journey ${before.journey ?? 'none'} -> ${after.journey ?? 'none'}`);
            }
        }
        if (before.type === 'capability' && after.type === 'capability') {
            if (before.strategy !== after.strategy) {
                semanticChanges.push(`Capability ${before.id}: strategy ${before.strategy ?? 'none'} -> ${after.strategy ?? 'none'}`);
            }
        }
    }

    return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, semanticChanges };
}