import type { AppSettings, Note } from '@notention/core';
import { JourneySpecSchema, type JourneySpec, type Step as JourneyStep } from '../journey.js';
import { edgesFrom, indexGraph } from './query.js';
import type { UisgGraph, UisgStep } from './types.js';

export interface ToJourneyOptions {
    seed: { notes: Note[]; settings: Partial<AppSettings> };
    id?: string;
    version?: number;
    conditions?: string[];
    status?: 'draft' | 'ready';
}

function compileStep(step: UisgStep): JourneyStep {
    switch (step.kind) {
        case 'show':
            return { kind: 'captureAria', label: step.name };
        case 'result':
            return step.statePath !== undefined
                ? { kind: 'assertState', path: step.statePath, equals: step.stateEquals }
                : { kind: 'capture', label: step.name };
        default: {
            if (!step.target || !step.action)
                throw new Error(`Step ${step.id} (${step.kind}) needs target and action to compile; run analyze first`);
            const { target, action, value } = step;
            return { kind: 'act', target, action, ...(value !== undefined && { value }) };
        }
    }
}

export function flowToJourney(graph: UisgGraph, flowId: string, options: ToJourneyOptions): JourneySpec {
    const index = indexGraph(graph);
    const flow = index.byId.get(flowId);
    if (flow?.type !== 'flow') throw new Error(`Flow ${flowId} not found`);
    if (!['existing', 'partial'].includes(flow.status)) throw new Error(`Flow ${flowId} is ${flow.status}; only implemented flows compile`);

    const contained = new Set(edgesFrom(index, flowId, 'contains').map(({ to }) => to));
    const steps: JourneyStep[] = [{ kind: 'seed', notes: options.seed.notes, settings: options.seed.settings }];
    const entrySurface = edgesFrom(index, flow.entry, 'renders')
        .map(({ to }) => index.byId.get(to))
        .find(node => node?.type === 'surface' && node.route && !node.route.includes(':'));
    if (entrySurface?.type === 'surface' && entrySurface.route) steps.push({ kind: 'navigate', hash: entrySurface.route });

    const seen = new Set<string>();
    let current: string | undefined = flow.entry;
    let last: UisgStep | undefined;
    while (current) {
        if (seen.has(current)) throw new Error(`Cycle at step ${current} in flow ${flowId}`);
        seen.add(current);
        const node = index.byId.get(current);
        if (node?.type !== 'step' || !contained.has(current)) throw new Error(`Step ${current} is not a contained step of ${flowId}`);
        steps.push(compileStep(node));
        last = node;
        const branches = edgesFrom(index, current, 'next');
        if (!branches.length) break;
        const taken = branches.length === 1 ? branches[0]
            : branches.find(({ when }) => when && options.conditions?.includes(when));
        if (!taken) throw new Error(`Step ${current} branches (${branches.map(({ when }) => when ?? '?').join(', ')}); pass conditions to choose a path`);
        current = taken.to;
    }
    if (last?.kind !== 'result') throw new Error(`Flow ${flowId} does not end in a result step`);

    const intent = edgesFrom(index, flowId, 'uses')
        .flatMap(({ to }) => edgesFrom(index, to, 'supports'))
        .map(({ to }) => index.byId.get(to))
        .find(node => node?.type === 'intent');

    return JourneySpecSchema.parse({
        id: options.id ?? flow.journey ?? `uisg.${flowId}`,
        version: options.version ?? 1,
        intent: intent?.name ?? flow.name,
        journeysTouched: [flowId],
        seed: options.seed,
        steps,
        status: options.status ?? 'draft',
    } satisfies JourneySpec);
}
