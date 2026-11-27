import { z } from 'zod';
import { UISG_SCHEMA_VERSION } from './types.js';
import type { UisgEdgeType, UisgGraph, UisgNode, UisgNodeType, UisgReversibility, UisgEffectRisk } from './types.js';
import {
    EDGE_TYPES,
    HYPEREDGE_TYPES,
    HYPEREDGE_MIN_NODES,
    STATUS_VALUES,
    CONFIDENCE_VALUES,
    SEAM_ROLE_VALUES,
    REVERSIBILITY_VALUES,
    EFFECT_RISK_VALUES,
    STEP_KIND_VALUES,
    VARIANT_STATUS_VALUES,
} from './constants.js';

const StatusSchema = z.enum(STATUS_VALUES);
const ConfidenceSchema = z.enum(CONFIDENCE_VALUES);
const SeamRoleSchema = z.enum(SEAM_ROLE_VALUES);
const ReversibilitySchema = z.enum(REVERSIBILITY_VALUES);
const EffectRiskSchema = z.enum(EFFECT_RISK_VALUES);

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

const VariantMetricsSchema = z.object({
    bundleKb: z.number().optional(),
    f1: z.number().optional(),
    taskTimeMs: z.number().optional(),
    visualPass: z.boolean().optional(),
});

const SurfaceVariantSchema = z.object({
    template: z.string().optional(),
    propsSchema: z.record(z.unknown()).optional(),
    strategyOverrides: z.record(SeamRoleSchema, z.string()).optional(),
    description: z.string().min(1),
    status: z.enum(VARIANT_STATUS_VALUES),
    promotedAt: z.string().optional(),
    metrics: VariantMetricsSchema.optional(),
});

const NodeSchema = z.discriminatedUnion('type', [
    z.object({ ...baseFields, type: z.literal('intent'), actor: z.string().optional(), outcome: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('capability'), seam: SeamRoleSchema.optional(), strategy: z.string().optional(), skill: z.string().optional(), risk: z.enum(['normal', 'caution', 'destructive']).optional(), effect: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('flow'), entry: z.string().min(1), outcome: z.string().min(1), journey: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('step'), kind: z.enum(STEP_KIND_VALUES), target: TargetSchema.optional(), action: z.enum(['click', 'fill', 'press', 'select']).optional(), value: z.string().optional(), statePath: z.string().optional(), stateEquals: z.unknown().optional(), guard: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('surface'), component: z.string().optional(), route: z.string().optional(), configKey: z.string().optional(), seam: SeamRoleSchema.optional(), template: z.string().optional(), propsSchema: z.record(z.unknown()).optional(), generatedFrom: z.string().optional(), variants: z.record(z.string(), SurfaceVariantSchema).optional(), defaultVariant: z.string().optional() }),
    z.object({ ...baseFields, type: z.literal('predicate'), expression: z.string().min(1), registryId: z.string().min(1) }),
    z.object({ ...baseFields, type: z.literal('effect'), reversibility: ReversibilitySchema, risk: EffectRiskSchema, confirmationRequired: z.boolean(), failureModes: z.array(z.string()), registryId: z.string().min(1) }),
]);

const EdgeSchema = z.object({
    from: z.string().min(1),
    type: z.enum(EDGE_TYPES),
    to: z.string().min(1),
    when: z.string().optional(),
    notes: z.string().optional(),
    weight: z.number().optional(),
    confidence: ConfidenceSchema.optional(),
});

const HyperedgeSchema = z.object({
    id: z.string().min(1),
    type: z.enum(HYPEREDGE_TYPES),
    nodes: z.array(z.string().min(1)).min(1),
    roles: z.record(z.string(), z.string()).optional(),
    when: z.string().optional(),
    notes: z.string().optional(),
    weight: z.number().optional(),
    confidence: ConfidenceSchema.optional(),
});

export const UisgGraphSchema = z.object({
    version: z.literal(UISG_SCHEMA_VERSION),
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
    hyperedges: z.array(HyperedgeSchema),
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

import { NODE_TYPES } from './constants.js';

const ALL_NODE_TYPES: UisgNodeType[] = [...NODE_TYPES];

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
    composes: { from: ['flow', 'intent'], to: ['flow', 'capability', 'surface'] },
    requires: { from: ['flow', 'step', 'capability', 'surface'], to: ['capability', 'predicate', 'surface'] },
    provides: { from: ['capability', 'surface'], to: ['intent', 'capability'] },
    satisfies: { from: ['capability', 'flow'], to: ['intent'] },
    dependsOn: { from: ALL_NODE_TYPES, to: ALL_NODE_TYPES },
    conflicts: { from: ALL_NODE_TYPES, to: ALL_NODE_TYPES },
    excludes: { from: ALL_NODE_TYPES, to: ALL_NODE_TYPES },
    fallback: { from: ['flow', 'step'], to: ['flow', 'step'] },
    precedes: { from: ['flow', 'step'], to: ['flow', 'step'] },
    parallel: { from: ['flow', 'step'], to: ['flow', 'step'] },
    variantOf: { from: ['surface'], to: ['surface'] },
    overrides: { from: ['capability', 'surface', 'flow'], to: ['capability', 'surface', 'flow'] },
    evidencedBy: { from: ALL_NODE_TYPES, to: 'reference' },
    documents: { from: ALL_NODE_TYPES, to: 'reference' },
    owns: { from: ['flow', 'capability', 'surface'], to: ['flow', 'capability', 'surface', 'step'] },
    tests: { from: ALL_NODE_TYPES, to: 'reference' },
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
        if (node.status === 'candidate' || node.status === 'experimental' || node.status === 'planned' || node.status === 'removed') continue;
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
    issues.push(...hyperedgeIssues(graph, byId));
    return issues;
}

function hyperedgeIssues(graph: UisgGraph, byId: Map<string, UisgNode>): GraphIssue[] {
    const issues: GraphIssue[] = [];
    const ids = new Set<string>();
    for (const hyperedge of graph.hyperedges) {
        if (ids.has(hyperedge.id)) issues.push(issue('error', 'duplicate-hyperedge-id', `Duplicate hyperedge id ${hyperedge.id}`, hyperedge.id));
        ids.add(hyperedge.id);
        const participants = new Set(hyperedge.nodes);
        if (participants.size !== hyperedge.nodes.length) {
            issues.push(issue('error', 'duplicate-hyperedge-node', `Hyperedge ${hyperedge.id} repeats a node`, hyperedge.id));
        }
        for (const nodeId of participants) {
            if (!byId.has(nodeId)) {
                issues.push(issue('error', 'dangling-hyperedge', `Hyperedge ${hyperedge.id} references missing node ${nodeId}`, hyperedge.id));
            }
        }
        const min = HYPEREDGE_MIN_NODES[hyperedge.type];
        if (participants.size < min) {
            issues.push(issue('error', 'hyperedge-arity', `Hyperedge ${hyperedge.id} (${hyperedge.type}) needs at least ${min} node(s)`, hyperedge.id));
        }
        for (const [role, nodeId] of Object.entries(hyperedge.roles ?? {})) {
            if (!participants.has(nodeId)) {
                issues.push(issue('error', 'hyperedge-role', `Hyperedge ${hyperedge.id} role "${role}" points to non-participant ${nodeId}`, hyperedge.id));
            }
        }
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

export const ContextProfileSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    actor: z.string().optional(),
    expertise: z.enum(['expert', 'intermediate', 'novice']).optional(),
    device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    connectivity: z.enum(['online', 'offline', 'intermittent', 'degraded']).optional(),
    locale: z.string().optional(),
    viewport: z.string().optional(),
    density: z.enum(['comfortable', 'compact', 'dense']).optional(),
    modality: z.enum(['pointer', 'touch', 'voice', 'keyboard']).optional(),
    profile: z.string().optional(),
    theme: z.string().optional(),
    extends: z.string().optional(),
    a11yConstraints: z.array(z.string()).optional(),
    strategyOverrides: z.record(z.string(), z.string()).optional(),
    templateVariants: z.record(z.string(), z.string()).optional(),
    featureFlags: z.array(z.string()).optional(),
});

export const ContextProfilesSchema = z.object({
    version: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    profiles: z.array(ContextProfileSchema),
});

export const ThemeSchema = z.object({
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    radius: z.string().regex(/^\d+px$/),
    font: z.string().min(1),
});

export const ThemesSchema = z.record(ThemeSchema);

export const VariantPatchSchema = z.object({
    template: z.string().optional(),
    propsSchema: z.record(z.unknown()).optional(),
    strategyOverrides: z.record(z.string(), z.string()).optional(),
    description: z.string().optional(),
    status: z.enum(['experimental', 'candidate', 'promoted', 'archived']).optional(),
    promotedAt: z.string().optional(),
    metrics: z.object({
        bundleKb: z.number().optional(),
        f1: z.number().optional(),
        taskTimeMs: z.number().optional(),
        visualPass: z.boolean().optional(),
    }).optional(),
});

export const VariantRecordSchema = z.object({
    surface: z.string().min(1),
    id: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    template: z.string().optional(),
    propsSchema: z.record(z.unknown()).optional(),
    strategyOverrides: z.record(z.string(), z.string()).optional(),
    description: z.string().min(1),
    status: z.enum(['experimental', 'candidate', 'promoted', 'archived']),
    promotedAt: z.string().optional(),
    metrics: z.object({
        bundleKb: z.number().optional(),
        f1: z.number().optional(),
        taskTimeMs: z.number().optional(),
        visualPass: z.boolean().optional(),
    }).optional(),
});

export const VariantsSchema = z.object({
    version: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    variants: z.array(VariantRecordSchema),
});

export const PolicyHardGatesSchema = z.object({
    zeroTypeErrors: z.boolean(),
    zeroAccessibilityViolations: z.boolean(),
    toneViolationsBaseline: z.number().int().nonnegative(),
    bundleSizeDeltaKb: z.number().int().nonnegative(),
});

export const PolicySoftGatesSchema = z.object({
    taskTimeMs: z.object({ weight: z.number().positive(), target: z.number().positive() }),
    interactionCount: z.object({ weight: z.number().positive(), target: z.number().positive() }),
    matchF1: z.object({ weight: z.number().positive(), target: z.number().min(0).max(1) }),
});

export const PolicySchema = z.object({
    version: z.number().int().positive().optional(),
    updatedAt: z.string().datetime().optional(),
    hardGates: PolicyHardGatesSchema,
    softGates: PolicySoftGatesSchema,
    visualThreshold: z.number().min(0).max(1),
    perSurfaceOverrides: z.record(z.string(), z.unknown()).optional(),
    perJourneyOverrides: z.record(z.string(), z.unknown()).optional(),
});

export const MatrixConfigSchema = z.object({
    contexts: z.array(z.string()),
    themes: z.array(z.string()),
    viewports: z.array(z.string()),
    variants: z.array(z.string()),
    parallelism: z.number().int().positive(),
    maxCells: z.number().int().positive().optional(),
    allowLarge: z.boolean().optional(),
    shard: z.string().optional(),
    skipCached: z.boolean().optional(),
});

export const MatrixCellResultSchema = z.object({
    flowId: z.string(),
    journey: z.string(),
    profile: z.string(),
    viewport: z.string(),
    theme: z.string(),
    context: z.string().optional(),
    variant: z.string().optional(),
    status: z.enum(['passed', 'failed', 'skipped', 'error']),
    durationMs: z.number().int().nonnegative(),
    runId: z.string(),
    assertions: z.array(z.unknown()),
    metrics: z.record(z.number()),
    screenshots: z.array(z.string()),
    bundlePath: z.string(),
    error: z.string().optional(),
});

export const MatrixResultSchema = z.object({
    runId: z.string(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    config: MatrixConfigSchema,
    cells: z.array(MatrixCellResultSchema),
    summary: z.object({
        total: z.number().int().nonnegative(),
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        errors: z.number().int().nonnegative(),
    }),
});

export function validateContextProfiles(input: unknown): ValidationResult {
    const parsed = ContextProfilesSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `contexts.json: ${path.join('.') || 'root'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    return { ok: true, graph: undefined, issues: [] };
}

export function validateThemes(input: unknown): ValidationResult {
    const parsed = ThemesSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `themes.json: ${path.join('.') || 'root'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    return { ok: true, graph: undefined, issues: [] };
}

export function validateVariants(input: unknown): ValidationResult {
    const parsed = VariantsSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `variants.json: ${path.join('.') || 'root'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    return { ok: true, graph: undefined, issues: [] };
}

export function validatePolicy(input: unknown): ValidationResult {
    const parsed = PolicySchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `policy.json: ${path.join('.') || 'root'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    return { ok: true, graph: undefined, issues: [] };
}

export function validateMatrix(input: unknown): ValidationResult {
    const parsed = MatrixResultSchema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(({ path, message }) =>
            issue('error', 'schema', `matrix.json: ${path.join('.') || 'root'}: ${message}`, path.join('.')));
        return { ok: false, issues };
    }
    return { ok: true, graph: undefined, issues: [] };
}

export function validateSurfaceVariant(variant: unknown): string[] {
    const parsed = VariantPatchSchema.safeParse(variant);
    if (!parsed.success) {
        return parsed.error.issues.map(({ path, message }) =>
            `SurfaceVariant: ${path.join('.') || 'root'}: ${message}`);
    }
    return [];
}