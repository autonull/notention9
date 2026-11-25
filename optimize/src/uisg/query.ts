import type {
    UisgEdge, UisgEdgeType, UisgGraph, UisgHyperedge, UisgHyperedgeType, UisgNode, UisgNodeType, UisgStatus, UisgStep,
} from './types.js';

export interface GraphIndex {
    byId: Map<string, UisgNode>;
    byType: Map<UisgNodeType, UisgNode[]>;
    out: Map<string, UisgEdge[]>;
    incoming: Map<string, UisgEdge[]>;
    hyperedgeById: Map<string, UisgHyperedge>;
    hyperedges: Map<string, UisgHyperedge[]>;
}

export function indexGraph(graph: UisgGraph): GraphIndex {
    const byId = new Map<string, UisgNode>();
    const byType = new Map<UisgNodeType, UisgNode[]>();
    const out = new Map<string, UisgEdge[]>();
    const incoming = new Map<string, UisgEdge[]>();
    const hyperedgeById = new Map<string, UisgHyperedge>();
    const hyperedges = new Map<string, UisgHyperedge[]>();
    for (const node of graph.nodes) {
        byId.set(node.id, node);
        (byType.get(node.type) ?? byType.set(node.type, []).get(node.type)!).push(node);
    }
    for (const edge of graph.edges) {
        (out.get(edge.from) ?? out.set(edge.from, []).get(edge.from)!).push(edge);
        (incoming.get(edge.to) ?? incoming.set(edge.to, []).get(edge.to)!).push(edge);
    }
    for (const hyperedge of graph.hyperedges) {
        hyperedgeById.set(hyperedge.id, hyperedge);
        for (const nodeId of new Set(hyperedge.nodes)) {
            (hyperedges.get(nodeId) ?? hyperedges.set(nodeId, []).get(nodeId)!).push(hyperedge);
        }
    }
    return { byId, byType, out, incoming, hyperedgeById, hyperedges };
}

export interface GraphQuery {
    type?: UisgNodeType;
    status?: UisgStatus;
    text?: string;
    seam?: string;
    journey?: string;
    source?: string;
}

export function queryGraph(index: GraphIndex, query: GraphQuery): UisgNode[] {
    const text = query.text?.toLowerCase();
    const candidates = query.type ? index.byType.get(query.type) ?? [] : [...index.byId.values()];
    return candidates.filter(node =>
        (!query.status || node.status === query.status) &&
        (!text || `${node.id} ${node.name} ${node.summary ?? ''}`.toLowerCase().includes(text)) &&
        (!query.seam || ('seam' in node && node.seam === query.seam)) &&
        (!query.journey || ('journey' in node && node.journey === query.journey)) &&
        (!query.source || node.source?.some(source => source.includes(query.source!))));
}

export function edgesFrom(index: GraphIndex, id: string, type?: UisgEdgeType): UisgEdge[] {
    const edges = index.out.get(id) ?? [];
    return type ? edges.filter(edge => edge.type === type) : edges;
}

export function hyperedgesFor(index: GraphIndex, nodeId: string, type?: UisgHyperedgeType): UisgHyperedge[] {
    const incident = index.hyperedges.get(nodeId) ?? [];
    return type ? incident.filter(hyperedge => hyperedge.type === type) : incident;
}

export function hyperedgeParticipants(index: GraphIndex, hyperedgeId: string): UisgNode[] {
    const hyperedge = index.hyperedgeById.get(hyperedgeId);
    if (!hyperedge) throw new Error(`Hyperedge ${hyperedgeId} not found`);
    return hyperedge.nodes
        .map(nodeId => index.byId.get(nodeId))
        .filter((node): node is UisgNode => node !== undefined);
}

export function flowSteps(index: GraphIndex, flowId: string): UisgStep[] {
    const flow = index.byId.get(flowId);
    if (flow?.type !== 'flow') throw new Error(`Flow ${flowId} not found`);
    const contained = new Set(edgesFrom(index, flowId, 'contains').map(({ to }) => to));
    const steps: UisgStep[] = [];
    const seen = new Set<string>();
    let current: string | undefined = flow.entry;
    while (current && contained.has(current) && !seen.has(current)) {
        seen.add(current);
        const node = index.byId.get(current);
        if (node?.type !== 'step') break;
        steps.push(node);
        current = edgesFrom(index, current, 'next')[0]?.to;
    }
    return steps;
}
