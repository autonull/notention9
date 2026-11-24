import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { UisgGraph } from './types.js';
import {
    buildSkeleton, emitSkeleton, skeletonJourneyFlows, skeletonJourneyId, skeletonOutputs, skeletonToJourney,
} from './skeleton.js';
import { simulateFlow } from './simulate.js';

const ROOT = resolve(__dirname, '../../..');
const graph: UisgGraph = JSON.parse(readFileSync(resolve(ROOT, 'doc/uisg/graph.json'), 'utf8'));

describe('skeleton generator', () => {
    it('compiles implemented flows in graph order with guards and effects', () => {
        const skeleton = buildSkeleton(graph);
        expect(skeleton.flows.map(({ id }) => id)).toEqual([
            'flow.capture-and-edit',
            'flow.capture-and-edit-keyboard',
            'flow.capture-and-edit-palette',
            'flow.golden-path',
            'flow.ontology-conflict',
            'flow.publish-gate',
        ]);
        const publish = skeleton.flows.find(({ id }) => id === 'flow.publish-gate');
        expect(publish?.route).toBe('#/notes/:noteId');
        expect(publish?.steps.map(({ id }) => id)).toEqual([
            'step.pub.open', 'step.pub.decide', 'step.pub.private', 'step.pub.published',
        ]);
        expect(publish?.guards.map(({ id }) => id)).toEqual(['pred.can-delete', 'pred.can-publish']);
        expect(publish?.steps[1].effects).toEqual([
            { id: 'eff.publish-note', name: 'Publish note', risk: 'consequential', reversibility: 'irreversible', confirmationRequired: true },
        ]);
        expect(publish?.effects.map(({ id }) => id)).toEqual(['eff.publish-note']);
    });

    it('emits deterministic, type-checked component data', () => {
        const skeleton = buildSkeleton(graph);
        expect(emitSkeleton(skeleton)).toBe(emitSkeleton(buildSkeleton(graph)));
        expect(emitSkeleton(skeleton)).toContain(skeleton.graphHash);
        expect(emitSkeleton(skeleton)).toContain('SkeletonRenderer');
    });

    it('generates preview journeys only for flows with guards or effects', () => {
        const skeleton = buildSkeleton(graph);
        expect(skeletonJourneyFlows(skeleton).map(({ id }) => id))
            .toEqual(['flow.ontology-conflict', 'flow.publish-gate']);
        expect(skeletonOutputs(skeleton).map(({ path }) => path)).toEqual([
            'ui/src/dev/uisg/GeneratedSkeleton.tsx',
            'ui/test/optimize/uisg.skeleton.flow.ontology-conflict.journey.ts',
            'ui/test/optimize/uisg.skeleton.flow.publish-gate.journey.ts',
        ]);
        expect(skeletonOutputs(skeleton).every(({ content }) => content.length > 100)).toBe(true);
        const publish = skeletonJourneyFlows(skeleton)[1];
        const spec = skeletonToJourney(publish);
        expect(spec.id).toBe(skeletonJourneyId('flow.publish-gate'));
        expect(spec.steps).toEqual(expect.arrayContaining([
            { kind: 'assertState', path: 'lastEffect', equals: 'eff.publish-note' },
            { kind: 'assertState', path: 'firedEffects.length', equals: 0 },
        ]));
        expect(spec.steps.filter(({ kind }) => kind === 'capture')).toHaveLength(1);
    });

    it('compiles the guard-only flow without effect steps', () => {
        const conflict = buildSkeleton(graph, { flowIds: ['flow.ontology-conflict'] }).flows;
        expect(conflict).toHaveLength(1);
        expect(conflict[0].guards).toHaveLength(1);
        const spec = skeletonToJourney(conflict[0]);
        expect(spec.steps.filter(({ kind }) => kind === 'act')).toHaveLength(1);
        expect(spec.steps.some(step => 'path' in step && step.path === 'lastEffect')).toBe(false);
    });

    it('simulates guards, effects, and branch blocking without a browser', () => {
        const blocked = simulateFlow(graph, 'flow.publish-gate');
        expect(blocked.status).toBe('blocked');
        expect(blocked.reason).toContain('pred.can-delete');
        expect(blocked.steps.map(({ id }) => id)).toEqual(['step.pub.open', 'step.pub.decide']);
        expect(blocked.steps[1].effects).toEqual([
            { id: 'eff.publish-note', name: 'Publish note', risk: 'consequential', reversibility: 'irreversible', confirmationRequired: true },
        ]);

        const completed = simulateFlow(graph, 'flow.publish-gate', ['pred.can-publish', 'pred.can-delete', 'confirmed']);
        expect(completed.status).toBe('completed');
        expect(completed.steps.map(({ id }) => id)).toEqual([
            'step.pub.open', 'step.pub.decide', 'step.pub.published',
        ]);
        expect(simulateFlow(graph, 'flow.missing').status).toBe('missing');
    });
});
