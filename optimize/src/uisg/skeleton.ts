import type { JourneySpec, Step as JourneyStep } from '../journey.js';
import { canonicalize, graphHash } from './canonicalize.js';
import { edgesFrom, indexGraph } from './query.js';
import type { UisgEffect, UisgGraph, UisgPredicate, UisgStep, UisgSurface } from './types.js';

export interface SkeletonEffect {
    id: string;
    name: string;
    risk: UisgEffect['risk'];
    reversibility: UisgEffect['reversibility'];
    confirmationRequired: boolean;
}

export interface SkeletonStep {
    id: string;
    name: string;
    kind: UisgStep['kind'];
    action?: UisgStep['action'];
    value?: string;
    target?: UisgStep['target'];
    statePath?: string;
    guardIds: string[];
    effects: SkeletonEffect[];
}

export interface SkeletonGuard {
    id: string;
    expression: string;
}

export interface SkeletonFlow {
    id: string;
    name: string;
    intent: string;
    route?: string;
    status: UisgStep['status'];
    steps: SkeletonStep[];
    guards: SkeletonGuard[];
    effects: SkeletonEffect[];
    surfaces: string[];
}

export interface UisgSkeleton {
    version: 1;
    graphHash: string;
    flows: SkeletonFlow[];
}

export interface BuildSkeletonOptions {
    flowIds?: string[];
    statuses?: UisgStep['status'][];
}

const PREVIEW_COMPONENT = 'ui/src/dev/GeneratedSkeleton.tsx';
const JOURNEY_DIR = 'ui/test/optimize';

const COMPILEABLE: UisgStep['status'][] = ['implemented', 'partial'];

function toEffect(node: UisgEffect): SkeletonEffect {
    return {
        id: node.id,
        name: node.name,
        risk: node.risk,
        reversibility: node.reversibility,
        confirmationRequired: node.confirmationRequired,
    };
}

function orderedSteps(index: ReturnType<typeof indexGraph>, flowId: string): UisgStep[] {
    const contained = new Set(edgesFrom(index, flowId, 'contains').map(({ to }) => to));
    const order: UisgStep[] = [];
    const seen = new Set<string>();
    const visit = (id: string) => {
        if (seen.has(id) || !contained.has(id)) return;
        seen.add(id);
        const node = index.byId.get(id);
        if (node?.type === 'step') order.push(node);
        for (const { to } of edgesFrom(index, id, 'next')) visit(to);
    };
    const flow = index.byId.get(flowId);
    if (flow?.type === 'flow') visit(flow.entry);
    for (const id of contained) visit(id);
    return order;
}

function stepEffects(index: ReturnType<typeof indexGraph>, step: UisgStep): SkeletonEffect[] {
    const seen = new Set<string>();
    const effects: SkeletonEffect[] = [];
    for (const { to } of edgesFrom(index, step.id, 'invokes')) {
        for (const { to: effectId } of edgesFrom(index, to, 'effects')) {
            if (seen.has(effectId)) continue;
            const node = index.byId.get(effectId);
            if (node?.type !== 'effect') continue;
            seen.add(effectId);
            effects.push(toEffect(node));
        }
    }
    return effects.sort((a, b) => a.id.localeCompare(b.id));
}

function flowEffects(index: ReturnType<typeof indexGraph>, flowId: string): SkeletonEffect[] {
    const seen = new Set<string>();
    const effects: SkeletonEffect[] = [];
    for (const { to } of edgesFrom(index, flowId, 'uses')) {
        for (const { to: effectId } of edgesFrom(index, to, 'effects')) {
            if (seen.has(effectId)) continue;
            const node = index.byId.get(effectId);
            if (node?.type !== 'effect') continue;
            seen.add(effectId);
            effects.push(toEffect(node));
        }
    }
    return effects.sort((a, b) => a.id.localeCompare(b.id));
}

function stepGuards(index: ReturnType<typeof indexGraph>, step: UisgStep): SkeletonGuard[] {
    return edgesFrom(index, step.id, 'guards')
        .map(({ to }) => index.byId.get(to))
        .filter((node): node is UisgPredicate => node?.type === 'predicate')
        .map(node => ({ id: node.id, expression: node.expression }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

function entryRoute(index: ReturnType<typeof indexGraph>, flowId: string): string | undefined {
    const flow = index.byId.get(flowId);
    if (flow?.type !== 'flow') return undefined;
    return edgesFrom(index, flow.entry, 'renders')
        .map(({ to }) => index.byId.get(to))
        .filter((node): node is UisgSurface => node?.type === 'surface')
        .map(node => node.route)
        .find((route): route is string => !!route);
}

export function buildSkeleton(graph: UisgGraph, options: BuildSkeletonOptions = {}): UisgSkeleton {
    const index = indexGraph(graph);
    const statuses = options.statuses ?? COMPILEABLE;
    const flows = [...index.byType.get('flow') ?? []]
        .filter(flow => statuses.includes(flow.status))
        .filter(flow => !options.flowIds || options.flowIds.includes(flow.id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((flow): SkeletonFlow => {
            if (flow.type !== 'flow') throw new Error(`Node ${flow.id} is not a flow`);
            const steps = orderedSteps(index, flow.id).map((step): SkeletonStep => ({
                id: step.id,
                name: step.name,
                kind: step.kind,
                ...(step.action && { action: step.action }),
                ...(step.value !== undefined && { value: step.value }),
                ...(step.target && { target: step.target }),
                ...(step.statePath !== undefined && { statePath: step.statePath }),
                guardIds: stepGuards(index, step).map(({ id }) => id),
                effects: stepEffects(index, step),
            }));
            const guards = [...new Map(steps.flatMap(step => step.guardIds)
                .map(id => index.byId.get(id))
                .filter((node): node is UisgPredicate => node?.type === 'predicate')
                .map(node => [node.id, node] as const)).values()]
                .map(node => ({ id: node.id, expression: node.expression }))
                .sort((a, b) => a.id.localeCompare(b.id));
            const surfaces = steps.flatMap(step => edgesFrom(index, step.id, 'renders').map(({ to }) => to));
            const route = entryRoute(index, flow.id);
            const effects = [...new Map([...flowEffects(index, flow.id), ...steps.flatMap(step => step.effects)]
                .map(effect => [effect.id, effect] as const)).values()]
                .sort((a, b) => a.id.localeCompare(b.id));
            return {
                id: flow.id,
                name: flow.name,
                intent: flow.name,
                ...(route && { route }),
                status: flow.status,
                steps,
                guards,
                effects,
                surfaces: [...new Set(surfaces)].sort(),
            };
        });
    return { version: 1, graphHash: graphHash(canonicalize(graph)), flows };
}

/** Flows that the generated preview compiles into a journey: guards or effects make behavior testable. */
export function skeletonJourneyFlows(skeleton: UisgSkeleton): SkeletonFlow[] {
    return skeleton.flows.filter(flow => flow.guards.length > 0 || flow.steps.some(step => step.effects.length));
}

export function skeletonJourneyId(flowId: string): string {
    return `uisg.skeleton.${flowId}`;
}

export function skeletonFlowIdFromJourney(journeyId: string): string | undefined {
    return journeyId.startsWith('uisg.skeleton.') ? journeyId.slice('uisg.skeleton.'.length) : undefined;
}

export function emitSkeleton(skeleton: UisgSkeleton): string {
    return `// AUTO-GENERATED by \`pnpm uisg skeleton --write\` from doc/uisg/graph.json (${skeleton.graphHash}). Do not edit.
import type {UisgSkeleton} from '@notention/optimize/uisg';
import {SkeletonRenderer} from './SkeletonRenderer';

const SKELETON = ${JSON.stringify(skeleton, null, 4)} satisfies UisgSkeleton;

export default function GeneratedSkeleton() {
    return <SkeletonRenderer skeleton={SKELETON}/>;
}
`;
}

function previewSteps(flow: SkeletonFlow): JourneyStep[] {
    const steps: JourneyStep[] = [
        { kind: 'assertVisible', target: { testId: 'skeleton-root' } },
        { kind: 'assertVisible', target: { testId: `skeleton-flow-${flow.id}` } },
        ...flow.steps.map((step): JourneyStep => ({ kind: 'assertVisible', target: { testId: `skeleton-step-${step.id}` } })),
    ];

    flow.guards.forEach((guard, index) => {
        steps.push(
            { kind: 'assertVisible', target: { testId: `skeleton-guard-${guard.id}` } },
            { kind: 'assertState', path: `guards.${index}.active`, equals: false },
            { kind: 'act', target: { testId: `skeleton-guard-${guard.id}` }, action: 'click' },
            { kind: 'waitForState', path: `guards.${index}.active`, equals: true, timeoutMs: 3000 },
        );
    });

    const step = flow.steps.find(candidate => candidate.effects.length > 0);
    if (step) {
        const effect = step.effects[0];
        steps.push(
            { kind: 'assertVisible', target: { testId: `skeleton-effect-${effect.id}` } },
            { kind: 'assertState', path: 'firedEffects.length', equals: 0 },
            { kind: 'act', target: { testId: `skeleton-run-${step.id}` }, action: 'click' },
        );
        if (effect.confirmationRequired) {
            steps.push(
                { kind: 'assertVisible', target: { role: 'dialog', name: effect.name } },
                { kind: 'assertState', path: 'firedEffects.length', equals: 0 },
                { kind: 'act', target: { role: 'button', name: 'Cancel' }, action: 'click' },
                { kind: 'act', target: { testId: `skeleton-run-${step.id}` }, action: 'click' },
                { kind: 'act', target: { role: 'button', name: 'Confirm', exact: true }, action: 'click' },
            );
        }
        steps.push(
            { kind: 'waitForState', path: 'firedEffects.length', equals: 1, timeoutMs: 3000 },
            { kind: 'assertState', path: 'lastEffect', equals: effect.id },
        );
    }

    steps.push({ kind: 'capture', label: `skeleton-${flow.id}` });
    return steps;
}

export function skeletonToJourney(flow: SkeletonFlow): JourneySpec {
    return {
        id: skeletonJourneyId(flow.id),
        version: 1,
        intent: `${flow.name} (generated skeleton)`,
        journeysTouched: [flow.id],
        seed: { notes: [], settings: {} },
        steps: previewSteps(flow),
        status: 'draft',
        dimensions: { profile: 'generated' },
    };
}

export function emitSkeletonJourneyTest(flow: SkeletonFlow): string {
    const journey = skeletonToJourney(flow);
    return `// AUTO-GENERATED by \`pnpm uisg skeleton --write\`. Do not edit.
import {registerJourney} from '@notention/optimize/registry';
import type {JourneySpec} from '@notention/optimize/journey';
import {test} from '@playwright/test';

const journey: JourneySpec = ${JSON.stringify(journey, null, 4)};

registerJourney(journey);

test('optimize: ${journey.id}', async ({page}) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    const {runJourneyTest} = await import('./support/journeyTest');
    await runJourneyTest('${journey.id}', page);
});
`;
}

export function skeletonOutputs(skeleton: UisgSkeleton): Array<{ path: string; content: string }> {
    return [
        { path: PREVIEW_COMPONENT, content: emitSkeleton(skeleton) },
        ...skeletonJourneyFlows(skeleton).map(flow => ({
            path: `${JOURNEY_DIR}/${skeletonJourneyId(flow.id)}.journey.ts`,
            content: emitSkeletonJourneyTest(flow),
        })),
    ];
}
