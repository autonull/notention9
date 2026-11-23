import { z } from 'zod';
import type { UisgEdgeType, UisgGraph, UisgNode, UisgNodeType, UisgReversibility, UisgEffectRisk } from './types.js';

const StatusSchema = z.enum(['existing', 'partial', 'planned', 'idea', 'removed']);
const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
const SeamRoleSchema = z.enum(['capture', 'elicit', 'match', 'display', 'layout', 'explain', 'ontology', 'intent']);
const ReversibilitySchema = z.enum(['reversible', 'compensatable', 'irreversible', 'unknown']);
const EffectRiskSchema = z.enum(['normal', 'caution', 'destructive', 'consequential']);

const baseFields = {
    id: z.string().min(1),
    name: z.string().min(1),
    status: StatusSchema,
    summary: z.string().optional(),
    source: z.array(z.string()).optional(),
    confidence: ConfidenceSchema.optional(),
};

const TargetSchema = z.union([
    z.object({ role: z.string(), name: z.string(), exact: z.boolean().optional(), modal: z.string().optional() }),
    z.object({ testId: z.string(), modal: z.string().optional() }),
    z.object({ label: z.string(), modal: z.string().optional() }),
]);

const NodeSchema = z.discriminatedUnion('type', [
    z.object({ ...baseFields, type: z.literal('intent'), actor: z.string().optional(), outcome: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('capability'), seam: SeamRoleSchema.optional(), strategy: z.string().optional(), skill: z.string().optional(), risk: z.enum(['normal', 'caution', 'destructive']).optional(), effect: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('flow'), entry: z.string().min(1), outcome: z.string().min(1), journey: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('step'), kind: z.enum(['show', 'action', 'choice', 'confirm', 'result']), target: TargetSchema.optional(), action: z.enum(['click', 'fill', 'press', 'select']).optional(), value: z.string().optional(), statePath: z.string().optional(), stateEquals: z.unknown().optional(), guard: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('surface'), component: z.string().optional(), route: z.string().optional(), configKey: z.string().optional(), seam: SeamRoleSchema.optional() }),
    z.object({ ...baseFields, type: z.literal('predicate'), expression: z.string().min(1), registryId: z.string().min(1) }),
    z.object({ ...baseFields, type: z.literal('effect'), reversibility: ReversibilitySchema, risk: EffectRiskSchema, confirmationRequired: z.boolean(), failureModes: z.array(z.string()), registryId: z.string().min(1) }),
]);

const EdgeSchema = z.object({
    from: z.string().min(1),
    type: z.enum(['supports', 'uses', 'invokes', 'contains', 'renders', 'next', 'alternative', 'implementedBy', 'guards', 'effects']),
    to: z.string().min(1),
    when: z.string().optional(),
    notes: z.string().optional(),
});

export const UisgGraphSchema = z.object({
    version: z.number().int().positive(),
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
});

export interface GraphIssue {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    ref?: string;
}

export interface ValidationResult {
    ok: boolean;
    graph?: UisgGraph;
    issues: GraphIssue[];
}

const EDGE_RULES: Record<UisgEdgeType, { from: UisgNodeType[]; to: UisgNodeType[] | 'reference' }> = {
    supports: { from: ['capability'], to: ['intent'] },
    uses: { from: ['flow'], to: ['capability'] },
    invokes: { from: ['step'], to: ['capability'] },
    contains: { from: ['flow'], to: ['step'] },
    renders: { from: ['step'], to: ['surface'] },
    next: { from: ['step'], to: ['step'] },
    alternative: { from: ['flow', 'step'], to: ['flow', 'step'] },
    implementedBy: { from: ['capability', 'surface'], to: 'reference' },
    guards: { from: ['step'], to: ['predicate'] },
    effects: { from: ['capability', 'step'], to: ['effect'] },
};

const issue = (severity: GraphIssue['severity'], code: string, message: string, ref?: string): GraphIssue =>
    ({ severity, code, message, ref });

function semanticIssues(graph: UisgGraph): GraphIssue[] {
    const issues: GraphIssue[] = [];
    const byId = new Map<string, UisgNode>();
    for (const node of graph.nodes) {
        if (byId.has(node.id)) issues.push(issue('error', 'duplicate-id', `Duplicate node id ${node.id}`, node.id));
        byId.set(node.id, node);
    }
    for (const edge of graph.edges) {
        const rule = EDGE_RULES[edge.type];
        const from = byId.get(edge.from);
        const ref = `${edge.from} -${edge.type}-> ${edge.to}`;
        if (!from) { issues.push(issue('error', 'dangling-edge', `Edge source ${edge.from} does not exist`, ref)); continue; }
        if (!rule.from.includes(from.type)) issues.push(issue('error', 'edge-direction', `${edge.type} cannot start at ${from.type} (${edge.from})`, ref));
        if (rule.to === 'reference') continue;
        const to = byId.get(edge.to);
        if (!to) { issues.push(issue('error', 'dangling-edge', `Edge target ${edge.to} does not exist`, ref)); continue; }
        if (!rule.to.includes(to.type)) issues.push(issue('error', 'edge-direction', `${edge.type} cannot end at ${to.type} (${edge.to})`, ref));
    }
    const contained = new Map<string, Set<string>>();
    const next = new Map<string, string[]>();
    for (const { from, type, to } of graph.edges) {
        if (type === 'contains') (contained.get(from) ?? contained.set(from, new Set()).get(from)!).add(to);
        if (type === 'next') (next.get(from) ?? next.set(from, []).get(from)!).push(to);
    }
    const inFlow = new Set([...contained.values()].flatMap(set => [...set]));
    for (const node of graph.nodes) {
        if (node.type === 'step' && !inFlow.has(node.id)) issues.push(issue('warning', 'orphan-step', `Step ${node.id} is not contained in any flow`, node.id));
        if (node.type !== 'flow') continue;
        const steps = contained.get(node.id) ?? new Set<string>();
        const entry = byId.get(node.entry);
        if (!entry || entry.type !== 'step') issues.push(issue('error', 'bad-entry', `Flow ${node.id} entry ${node.entry} is not a step`, node.id));
        else if (!steps.has(node.entry)) issues.push(issue('error', 'bad-entry', `Flow ${node.id} entry ${node.entry} is not contained in the flow`, node.id));
        if (node.status === 'idea' || node.status === 'planned' || node.status === 'removed') continue;
        const reached = new Set<string>();
        const queue = steps.has(node.entry) ? [node.entry] : [];
        while (queue.length) {
            const id = queue.shift()!;
            if (reached.has(id)) continue;
            reached.add(id);
            queue.push(...(next.get(id) ?? []).filter(to => steps.has(to)));
        }
        for (const id of steps) {
            if (!reached.has(id)) issues.push(issue('warning', 'unreachable-step', `Step ${id} is unreachable from ${node.entry} in flow ${node.id}`, id));
            const step = byId.get(id);
            if (step?.type === 'step' && step.kind !== 'result' && !(next.get(id) ?? []).length)
                issues.push(issue('warning', 'dead-end', `Step ${id} (${step.kind}) has no next edge in flow ${node.id}`, id));
        }
    }
    for (const edge of graph.edges) {
        if (edge.type !== 'next' || edge.when) continue;
        const from = byId.get(edge.from);
        if (from?.type === 'step' && from.kind === 'choice' && (next.get(edge.from) ?? []).length > 1)
            issues.push(issue('warning', 'unlabeled-branch', `Choice step ${edge.from} has an unlabeled branch to ${edge.to}`, edge.from));
    }
    return issues;
}

export function validateGraph(input: unknown): ValidationResult {
    const parsed = UisgGraphSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `${path.join('.') || 'graph'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    const issues = semanticIssues(parsed.data as UisgGraph);
    return { ok: !issues.some(({ severity }) => severity === 'error'), graph: parsed.data as UisgGraph, issues };
}