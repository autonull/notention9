import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './cli.js';
import { indexGraph, queryGraph } from './query.js';
import { validateGraph } from './validate.js';
import { loadPriority } from './rank.js';
import { loadContexts, type ContextProfile } from './contexts.js';
import type { UisgGraph, UisgNode, UisgNodeType } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const SELECTION_FILE = resolve(ROOT, 'doc/uisg/selection.json');

export interface SelectionRequest {
    feature: string;
    context?: string;
    profile?: string;
    modality?: string;
    theme?: string;
    viewport?: string;
    connectivity?: string;
    locale?: string;
    expertise?: string;
}

export interface SelectionConflict {
    type: 'requires' | 'excludes' | 'cardinality' | 'lifecycle' | 'platform' | 'modality' | 'theme' | 'context';
    message: string;
    nodes: string[];
}

export interface SelectionResult {
    request: SelectionRequest;
    selected: string[];
    explanation: string;
    conflicts: SelectionConflict[];
    satisfied: boolean;
}

function getContextProfile(contextId: string): ContextProfile | null {
    const contexts = loadContexts();
    if (!contexts) return null;
    return contexts.profiles.find(p => p.id === contextId) ?? null;
}

function getNodeById(graph: UisgGraph, id: string): UisgNode | undefined {
    return graph.nodes.find(n => n.id === id);
}

function checkRequires(node: UisgNode, graph: UisgGraph, index: ReturnType<typeof indexGraph>): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    const requires = node.source?.filter(s => s.startsWith('requires:')) ?? [];
    for (const req of requires) {
        const reqId = req.replace('requires:', '');
        const reqNode = getNodeById(graph, reqId);
        if (!reqNode) {
            conflicts.push({ type: 'requires', message: `Required node ${reqId} not found`, nodes: [node.id, reqId] });
        } else if (reqNode.status === 'removed' || reqNode.status === 'rejected') {
            conflicts.push({ type: 'requires', message: `Required node ${reqId} is ${reqNode.status}`, nodes: [node.id, reqId] });
        }
    }
    return conflicts;
}

function checkExcludes(node: UisgNode, graph: UisgGraph, selected: Set<string>): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    const excludes = node.source?.filter(s => s.startsWith('excludes:')) ?? [];
    for (const exc of excludes) {
        const excId = exc.replace('excludes:', '');
        if (selected.has(excId)) {
            conflicts.push({ type: 'excludes', message: `Node ${node.id} excludes ${excId}`, nodes: [node.id, excId] });
        }
    }
    return conflicts;
}

function checkCardinality(node: UisgNode, graph: UisgGraph, index: ReturnType<typeof indexGraph>, selected: Set<string>): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    const cardinality = node.source?.find(s => s.startsWith('cardinality:'));
    if (cardinality) {
        const [, maxStr] = cardinality.split(':');
        const max = parseInt(maxStr, 10);
        if (!isNaN(max) && node.type === 'capability') {
            const seam = node.seam;
            if (seam) {
                const sameSeamSelected = [...selected].filter(id => {
                    const n = getNodeById(graph, id);
                    return n?.type === 'capability' && n.seam === seam;
                });
                if (sameSeamSelected.length >= max) {
                    conflicts.push({
                        type: 'cardinality',
                        message: `Seam ${seam} cardinality exceeded (max ${max})`,
                        nodes: [node.id, ...sameSeamSelected],
                    });
                }
            }
        }
    }
    return conflicts;
}

function checkLifecycle(node: UisgNode): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    if (node.status === 'removed' || node.status === 'rejected') {
        conflicts.push({ type: 'lifecycle', message: `Node ${node.id} is ${node.status}`, nodes: [node.id] });
    }
    if (node.status === 'candidate' && node.confidence === 'low') {
        conflicts.push({ type: 'lifecycle', message: `Node ${node.id} is candidate with low confidence`, nodes: [node.id] });
    }
    return conflicts;
}

function checkPlatform(node: UisgNode, profile: ContextProfile): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    if (profile.device === 'mobile' && node.type === 'surface') {
        if (node.component && !node.component.toLowerCase().includes('mobile')) {
            // This is a heuristic; real implementation would check responsive variants
        }
    }
    return conflicts;
}

function checkModality(node: UisgNode, modality: string): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    if (node.type === 'capability' && node.strategy) {
        // Strategies may declare supported modalities
        // This is a placeholder for actual strategy metadata
    }
    return conflicts;
}

function checkTheme(node: UisgNode, theme: string): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    // Surfaces may declare theme support
    return conflicts;
}

function checkContext(node: UisgNode, context: ContextProfile): SelectionConflict[] {
    const conflicts: SelectionConflict[] = [];
    // Check a11y constraints
    if (context.a11yConstraints.length > 0 && node.type === 'surface') {
        // Would check if surface meets a11y requirements
    }
    return conflicts;
}

export function selectFeature(request: SelectionRequest): SelectionResult {
    const graph = loadGraph(new Map());
    const validation = validateGraph(graph);
    if (!validation.ok || !validation.graph) {
        throw new Error('Graph validation failed; cannot select');
    }

    const index = indexGraph(validation.graph);
    const priority = loadPriority();
    const contextProfile = request.context ? getContextProfile(request.context) : null;

    // Build selection criteria from request and context
    const effectiveModality = request.modality ?? contextProfile?.dimensions.modality ?? 'pointer';
    const effectiveTheme = request.theme ?? contextProfile?.dimensions.theme ?? 'dark';
    const effectiveViewport = request.viewport ?? contextProfile?.dimensions.viewport ?? 'desktop-1440';
    const effectiveProfile = request.profile ?? contextProfile?.dimensions.profile ?? 'default';

    // Find candidate nodes matching the feature request
    const candidates = queryGraph(index, { text: request.feature });
    if (candidates.length === 0) {
        return {
            request,
            selected: [],
            explanation: `No nodes found matching feature "${request.feature}"`,
            conflicts: [{ type: 'requires', message: 'Feature not found in graph', nodes: [] }],
            satisfied: false,
        };
    }

    // Sort candidates by priority score
    const priorityMap = new Map(priority?.items.map(i => [i.nodeId, i.score]) ?? []);
    candidates.sort((a, b) => (priorityMap.get(b.id) ?? 0) - (priorityMap.get(a.id) ?? 0));

    const selected = new Set<string>();
    const allConflicts: SelectionConflict[] = [];

    for (const candidate of candidates) {
        const conflicts: SelectionConflict[] = [];

        // Check all constraints
        conflicts.push(...checkRequires(candidate, validation.graph, index));
        conflicts.push(...checkExcludes(candidate, validation.graph, selected));
        conflicts.push(...checkCardinality(candidate, validation.graph, index, selected));
        conflicts.push(...checkLifecycle(candidate));
        if (contextProfile) conflicts.push(...checkPlatform(candidate, contextProfile));
        conflicts.push(...checkModality(candidate, effectiveModality));
        conflicts.push(...checkTheme(candidate, effectiveTheme));
        if (contextProfile) conflicts.push(...checkContext(candidate, contextProfile));

        const hardConflicts = conflicts.filter(c => c.type !== 'lifecycle' || c.message.includes('removed'));
        if (hardConflicts.length === 0) {
            selected.add(candidate.id);
        } else {
            allConflicts.push(...hardConflicts);
        }
    }

    // If nothing selected due to conflicts, return the top candidate with conflicts
    let finalSelected = [...selected];
    let satisfied = finalSelected.length > 0;
    let explanation = satisfied
        ? `Selected ${finalSelected.length} node(s) for "${request.feature}" under context "${request.context ?? 'default'}"`
        : `No valid selection for "${request.feature}"; constraints not satisfied`;

    if (!satisfied && candidates.length > 0) {
        // Return the top candidate with its conflicts for human review
        const top = candidates[0];
        const topConflicts = [
            ...checkRequires(top, validation.graph, index),
            ...checkExcludes(top, validation.graph, selected),
            ...checkCardinality(top, validation.graph, index, selected),
            ...checkLifecycle(top),
            ...(contextProfile ? checkPlatform(top, contextProfile) : []),
            ...checkModality(top, effectiveModality),
            ...checkTheme(top, effectiveTheme),
            ...(contextProfile ? checkContext(top, contextProfile) : []),
        ];
        allConflicts.push(...topConflicts);
        finalSelected = [top.id];
        explanation = `Top candidate ${top.id} (${top.name}) conflicts with constraints; human review required`;
    }

    const result: SelectionResult = {
        request,
        selected: finalSelected,
        explanation,
        conflicts: allConflicts,
        satisfied,
    };

    writeFileSync(SELECTION_FILE, JSON.stringify(result, null, 2) + '\n');
    return result;
}

export function loadSelection(): SelectionResult | null {
    try {
        return JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as SelectionResult;
    } catch {
        return null;
    }
}