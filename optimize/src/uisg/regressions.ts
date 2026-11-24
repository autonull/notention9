import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeGraph } from './analyze.js';
import type { UisgEdge, UisgGraph } from './types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CATALOGUE_FILE = resolve(ROOT, 'doc/uisg/regressions.json');

export type RegressionFamily = 'integrity' | 'traceability' | 'flow-state' | 'a11y-ergonomics';
export type MutationKind =
    | 'duplicate-node'
    | 'dangling-edge'
    | 'wrong-edge-direction'
    | 'detach-step'
    | 'remove-target'
    | 'retarget-journey'
    | 'downgrade-confirm'
    | 'rename-cancel-branch'
    | 'strip-result-assertion'
    | 'strip-surface-grounding';

export interface RegressionMutation {
    kind: MutationKind;
    nodeId?: string;
    flowId?: string;
    journey?: string;
    edge?: UisgEdge;
}

export interface RegressionSeed {
    id: string;
    family: RegressionFamily;
    description: string;
    mutation: RegressionMutation;
    expectedCode: string;
}

export interface RegressionCatalogue {
    version: number;
    seeds: RegressionSeed[];
}

export interface RegressionOutcome {
    seedId: string;
    family: RegressionFamily;
    expectedCode: string;
    detected: boolean;
    findings: string[];
}

const clone = (graph: UisgGraph): UisgGraph => JSON.parse(JSON.stringify(graph));

const stepIdsOf = (graph: UisgGraph, flowId: string): Set<string> =>
    new Set(graph.edges.filter(edge => edge.from === flowId && edge.type === 'contains').map(edge => edge.to));

const stripFields = (node: object, keys: string[]): object => {
    const copy = { ...node } as Record<string, unknown>;
    for (const key of keys) delete copy[key];
    return copy;
};

export function applyMutation(graph: UisgGraph, mutation: RegressionMutation): UisgGraph {
    const next = clone(graph);
    const { kind, nodeId, flowId, journey, edge } = mutation;
    switch (kind) {
        case 'duplicate-node': {
            const node = next.nodes.find(n => n.id === nodeId);
            if (node) next.nodes.push({ ...node });
            break;
        }
        case 'dangling-edge':
        case 'wrong-edge-direction': {
            if (edge) next.edges.push({ ...edge });
            break;
        }
        case 'detach-step': {
            next.edges = next.edges.filter(e => !(e.type === 'contains' && e.to === nodeId));
            break;
        }
        case 'remove-target': {
            next.nodes = next.nodes.map(n =>
                n.id === nodeId && n.type === 'step' ? (stripFields(n, ['target']) as typeof n) : n
            );
            break;
        }
        case 'retarget-journey': {
            next.nodes = next.nodes.map(n => (n.id === nodeId && n.type === 'flow' ? { ...n, journey } : n));
            break;
        }
        case 'downgrade-confirm': {
            next.nodes = next.nodes.map(n =>
                n.id === nodeId && n.type === 'step' && n.kind === 'confirm' ? { ...n, kind: 'action' as const } : n
            );
            break;
        }
        case 'rename-cancel-branch': {
            const steps = stepIdsOf(next, flowId ?? '');
            next.edges = next.edges.map(e =>
                e.type === 'next' && steps.has(e.from) && (e.when === 'cancelled' || e.when === 'denied')
                    ? { ...e, when: 'dismissed' }
                    : e
            );
            break;
        }
        case 'strip-result-assertion': {
            next.nodes = next.nodes.map(n =>
                n.id === nodeId && n.type === 'step'
                    ? (stripFields(n, ['statePath', 'stateEquals']) as typeof n)
                    : n
            );
            break;
        }
        case 'strip-surface-grounding': {
            next.nodes = next.nodes.map(n =>
                n.id === nodeId && n.type === 'surface'
                    ? (stripFields(n, ['component', 'route', 'configKey']) as typeof n)
                    : n
            );
            break;
        }
    }
    return next;
}

export function loadRegressionCatalogue(file: string = CATALOGUE_FILE): RegressionCatalogue {
    return JSON.parse(readFileSync(file, 'utf8')) as RegressionCatalogue;
}

export function runSeededRegressions(
    graph: UisgGraph,
    catalogue: RegressionCatalogue,
    journeyIds: ReadonlySet<string>
): RegressionOutcome[] {
    return catalogue.seeds.map(seed => {
        const findings = analyzeGraph(applyMutation(graph, seed.mutation), { journeyIds });
        const codes = new Set(findings.map(({ issue }) => issue));
        return {
            seedId: seed.id,
            family: seed.family,
            expectedCode: seed.expectedCode,
            detected: codes.has(seed.expectedCode),
            findings: [...codes],
        };
    });
}
