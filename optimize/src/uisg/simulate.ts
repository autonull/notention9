import { edgesFrom, indexGraph } from './query.js';
import type { SkeletonEffect } from './skeleton.js';
import type { UisgEffect, UisgGraph, UisgPredicate, UisgStep } from './types.js';

export interface SimulatedStep {
    id: string;
    name: string;
    kind: UisgStep['kind'];
    guards: Array<{ id: string; satisfied: boolean }>;
    effects: SkeletonEffect[];
}

export interface Simulation {
    flowId: string;
    status: 'completed' | 'blocked' | 'missing';
    conditions: string[];
    steps: SimulatedStep[];
    reason?: string;
}

function effectsOf(index: ReturnType<typeof indexGraph>, step: UisgStep): SkeletonEffect[] {
    return edgesFrom(index, step.id, 'invokes')
        .flatMap(({ to }) => edgesFrom(index, to, 'effects'))
        .map(({ to }) => index.byId.get(to))
        .filter((node): node is UisgEffect => node?.type === 'effect')
        .map(node => ({
            id: node.id, name: node.name, risk: node.risk,
            reversibility: node.reversibility, confirmationRequired: node.confirmationRequired,
        }))
        .filter((effect, position, all) => all.findIndex(({ id }) => id === effect.id) === position)
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function simulateFlow(graph: UisgGraph, flowId: string, conditions: string[] = []): Simulation {
    const index = indexGraph(graph);
    const flow = index.byId.get(flowId);
    if (flow?.type !== 'flow') return { flowId, status: 'missing', conditions, steps: [] };

    const satisfied = new Set(conditions);
    const contained = new Set(edgesFrom(index, flowId, 'contains').map(({ to }) => to));
    const steps: SimulatedStep[] = [];
    const visited = new Set<string>();
    let current: string | undefined = flow.entry;

    while (current) {
        if (visited.has(current)) return { flowId, status: 'blocked', conditions, steps, reason: `cycle at ${current}` };
        visited.add(current);
        const node = index.byId.get(current);
        if (node?.type !== 'step' || !contained.has(current)) {
            return { flowId, status: 'blocked', conditions, steps, reason: `step ${current} is not contained in ${flowId}` };
        }
        const guards = edgesFrom(index, current, 'guards')
            .map(({ to }) => index.byId.get(to))
            .filter((guard): guard is UisgPredicate => guard?.type === 'predicate')
            .map(guard => ({ id: guard.id, satisfied: satisfied.has(guard.id) || satisfied.has(guard.expression) }));
        steps.push({ id: node.id, name: node.name, kind: node.kind, guards, effects: effectsOf(index, node) });

        const blocked = guards.filter(({ satisfied: ok }) => !ok);
        if (blocked.length) {
            return {
                flowId, status: 'blocked', conditions, steps,
                reason: `guards not satisfied: ${blocked.map(({ id }) => id).join(', ')}`,
            };
        }

        const branches = edgesFrom(index, current, 'next');
        if (!branches.length) {
            return node.kind === 'result'
                ? { flowId, status: 'completed', conditions, steps }
                : { flowId, status: 'blocked', conditions, steps, reason: `step ${current} has no next step` };
        }
        const taken = branches.length === 1
            ? branches[0]
            : branches.find(({ when }) => when && satisfied.has(when));
        if (!taken) {
            return {
                flowId, status: 'blocked', conditions, steps,
                reason: `branch at ${current} needs one of: ${branches.map(({ when }) => when ?? '?').join(', ')}`,
            };
        }
        current = taken.to;
    }

    return { flowId, status: 'blocked', conditions, steps, reason: 'empty flow' };
}
