import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JourneySpecSchema } from '../journey.js';
import '../journeys.js';
import { getAllJourneys, getJourney } from '../registry.js';
import { analyzeGraph, journeyTargetDrift } from './analyze.js';
import { compareBundles } from './compare.js';
import type { EvidenceBundle } from '../evidence.js';
import { indexGraph, queryGraph, flowSteps } from './query.js';
import { flowToJourney } from './toJourney.js';
import { validateGraph } from './validate.js';
import type { UisgGraph } from './types.js';

const minimal: UisgGraph = {
    version: 1,
    nodes: [
        { id: 'intent.test', type: 'intent', name: 'Test intent', status: 'implemented' },
        { id: 'cap.test', type: 'capability', name: 'Test capability', status: 'implemented', seam: 'elicit', source: ['optimize/src/uisg/types.ts'] },
        { id: 'flow.test', type: 'flow', name: 'Test flow', status: 'implemented', entry: 'step.act', outcome: 'Done.' },
        { id: 'step.act', type: 'step', name: 'Act', status: 'implemented', kind: 'action', action: 'click', target: { testId: 'go' } },
        { id: 'step.done', type: 'step', name: 'Done', status: 'implemented', kind: 'result', statePath: 'note.title', stateEquals: 'x' },
        { id: 'surface.test', type: 'surface', name: 'Test surface', status: 'implemented', component: 'NotesView', route: '#/notes' },
    ],
    edges: [
        { from: 'cap.test', type: 'supports', to: 'intent.test' },
        { from: 'flow.test', type: 'uses', to: 'cap.test' },
        { from: 'flow.test', type: 'contains', to: 'step.act' },
        { from: 'flow.test', type: 'contains', to: 'step.done' },
        { from: 'step.act', type: 'renders', to: 'surface.test' },
        { from: 'step.act', type: 'next', to: 'step.done', when: 'ok' },
    ],
};

const clone = (): UisgGraph => JSON.parse(JSON.stringify(minimal));

describe('validateGraph', () => {
    it('accepts a minimal well-formed graph', () => {
        const { ok, issues } = validateGraph(minimal);
        expect(ok).toBe(true);
        expect(issues).toEqual([]);
    });

    it('rejects duplicate ids and dangling edges', () => {
        const graph = clone();
        graph.nodes.push({ ...graph.nodes[0] });
        graph.edges.push({ from: 'step.act', type: 'next', to: 'step.missing' });
        const { ok, issues } = validateGraph(graph);
        expect(ok).toBe(false);
        expect(issues.map(({ code }) => code)).toContain('duplicate-id');
        expect(issues.map(({ code }) => code)).toContain('dangling-edge');
    });

    it('rejects wrong edge direction', () => {
        const graph = clone();
        graph.edges.push({ from: 'intent.test', type: 'supports', to: 'cap.test' });
        const { ok, issues } = validateGraph(graph);
        expect(ok).toBe(false);
        expect(issues.some(({ code }) => code === 'edge-direction')).toBe(true);
    });

    it('warns on unreachable steps and dead ends', () => {
        const graph = clone();
        graph.nodes.push({ id: 'step.orphan', type: 'step', name: 'Orphan', status: 'implemented', kind: 'action' });
        graph.edges.push({ from: 'flow.test', type: 'contains', to: 'step.orphan' });
        const { ok, issues } = validateGraph(graph);
        expect(ok).toBe(true);
        expect(issues.map(({ code }) => code)).toEqual(expect.arrayContaining(['unreachable-step', 'dead-end']));
    });

    it('rejects schema violations', () => {
        const { ok, issues } = validateGraph({ version: 0, nodes: [], edges: [] });
        expect(ok).toBe(false);
        expect(issues[0].code).toBe('schema');
    });
});

describe('queryGraph', () => {
    const index = indexGraph(minimal);

    it('filters by type, status, and text', () => {
        expect(queryGraph(index, { type: 'step' }).map(({ id }) => id)).toEqual(['step.act', 'step.done']);
        expect(queryGraph(index, { text: 'capability' }).map(({ id }) => id)).toEqual(['cap.test']);
        expect(queryGraph(index, { seam: 'elicit' }).map(({ id }) => id)).toEqual(['cap.test']);
        expect(queryGraph(index, { status: 'candidate' })).toEqual([]);
    });

    it('walks flow steps in next order', () => {
        expect(flowSteps(index, 'flow.test').map(({ id }) => id)).toEqual(['step.act', 'step.done']);
    });
});

describe('flowToJourney', () => {
    const seed = { notes: [], settings: {} };

    it('compiles a flow to a valid JourneySpec', () => {
        const spec = flowToJourney(minimal, 'flow.test', { seed });
        expect(() => JourneySpecSchema.parse(spec)).not.toThrow();
        expect(spec.intent).toBe('Test intent');
        expect(spec.status).toBe('draft');
        expect(spec.steps.map(({ kind }) => kind)).toEqual(['seed', 'navigate', 'act', 'assertState']);
    });

    it('refuses untargeted steps and non-implemented flows', () => {
        const graph = clone();
        (graph.nodes[3] as { target?: unknown }).target = undefined;
        expect(() => flowToJourney(graph, 'flow.test', { seed })).toThrow(/target and action/);
        const idea = clone();
        idea.nodes[2] = { ...idea.nodes[2], status: 'candidate' } as never;
        expect(() => flowToJourney(idea, 'flow.test', { seed })).toThrow(/only implemented flows/);
    });

    it('requires conditions at branches', () => {
        const graph = clone();
        graph.nodes.push({ id: 'step.alt', type: 'step', name: 'Alt', status: 'implemented', kind: 'result' });
        graph.edges.push({ from: 'flow.test', type: 'contains', to: 'step.alt' });
        graph.edges.push({ from: 'step.act', type: 'next', to: 'step.alt', when: 'cancelled' });
        expect(() => flowToJourney(graph, 'flow.test', { seed })).toThrow(/conditions/);
        const spec = flowToJourney(graph, 'flow.test', { seed, conditions: ['cancelled'] });
        expect(spec.steps.at(-1)).toMatchObject({ kind: 'capture', label: 'Alt' });
    });
});

describe('analyzeGraph', () => {
    it('flags destructive flows without confirmation or recovery', () => {
        const graph = clone();
        (graph.nodes[1] as { risk?: string }).risk = 'destructive';
        graph.edges.push({ from: 'step.act', type: 'invokes', to: 'cap.test' });
        const issues = analyzeGraph(graph).map(({ issue }) => issue);
        expect(issues).toEqual(expect.arrayContaining(['missing-confirmation', 'missing-recovery']));
    });

    it('flags untargeted steps and stale journey links', () => {
        const graph = clone();
        (graph.nodes[3] as { target?: unknown }).target = undefined;
        graph.nodes[2] = { ...graph.nodes[2], journey: 'no-such-journey' } as never;
        const issues = analyzeGraph(graph, { journeyIds: new Set(['capture-and-edit']) }).map(({ issue }) => issue);
        expect(issues).toEqual(expect.arrayContaining(['untargeted-step', 'stale-journey-link']));
    });
});

describe('compareBundles', () => {
    const bundle = (overrides: Partial<EvidenceBundle>): EvidenceBundle => ({
        runId: 'run-x', journeyId: 'journey-x', startedAt: '', completedAt: '', status: 'passed',
        steps: [], snapshots: [], console: [], network: [], promptTraces: [], actionTraces: [], assertions: [],
        ...overrides,
    });
    const step = (index: number, kind: string, durationMs: number, ok = true) =>
        ({ index, kind, startedAt: '', durationMs, ok });

    it('summarizes status, durations, and failed assertions', () => {
        const a = bundle({
            journeyId: 'baseline', status: 'passed',
            steps: [step(0, 'act', 100), step(1, 'assertState', 20)],
            assertions: [{ id: 'a:0', ok: true }],
        });
        const b = bundle({
            journeyId: 'variant', status: 'failed',
            steps: [step(0, 'act', 160), step(1, 'assertState', 20)],
            assertions: [{ id: 'b:0', ok: false }],
        });
        const comparison = compareBundles(a, b);
        expect(comparison.a).toMatchObject({ journeyId: 'baseline', status: 'passed', durationMs: 120, failedAssertions: [] });
        expect(comparison.b).toMatchObject({ journeyId: 'variant', status: 'failed', durationMs: 180, failedAssertions: ['b:0'] });
        expect(comparison.durationDeltaMs).toBe(60);
        expect(comparison.kindMismatch).toBe(false);
        expect(comparison.stepDeltas[0].deltaMs).toBe(60);
    });

    it('flags kind mismatches and unequal lengths', () => {
        const a = bundle({ steps: [step(0, 'act', 10)] });
        const b = bundle({ steps: [step(0, 'capture', 10), step(1, 'act', 5)] });
        const comparison = compareBundles(a, b);
        expect(comparison.kindMismatch).toBe(true);
        expect(comparison.stepDeltas).toHaveLength(2);
        expect(comparison.stepDeltas[1].kindA).toBeUndefined();
    });
});

describe('journeyTargetDrift', () => {
    it('flags missing testIds once per journey and ignores present ones', () => {
        const spec = JourneySpecSchema.parse({
            id: 'drift-test', version: 1, intent: 'test', journeysTouched: [],
            seed: { notes: [], settings: {} }, status: 'draft',
            steps: [
                { kind: 'act', target: { testId: 'gone' }, action: 'click' },
                { kind: 'act', target: { testId: 'gone' }, action: 'fill', value: 'x' },
                { kind: 'act', target: { testId: 'here' }, action: 'click' },
                { kind: 'act', target: { role: 'button', name: 'Go' }, action: 'click' },
            ],
        });
        const findings = journeyTargetDrift([spec], new Set(['here']));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ issue: 'journey-target-drift', severity: 'high', nodeId: 'drift-test' });
        expect(journeyTargetDrift([spec], new Set(['here', 'gone']))).toEqual([]);
    });
});

describe('real graph', () => {
    const file = fileURLToPath(new URL('../../../doc/uisg/graph.json', import.meta.url));
    const raw = JSON.parse(readFileSync(file, 'utf8'));

    it('validates without errors', () => {
        const { ok, graph } = validateGraph(raw);
        expect(ok).toBe(true);
        expect(graph?.nodes.length).toBeGreaterThan(0);
    });

    it('compiles capture-and-edit with the registered journey seed', () => {
        const { graph } = validateGraph(raw);
        const seed = getJourney('capture-and-edit')!.seed;
        const spec = flowToJourney(graph!, 'flow.capture-and-edit', { seed });
        expect(() => JourneySpecSchema.parse(spec)).not.toThrow();
        expect(spec.id).toBe('capture-and-edit');
        expect(spec.steps.some(step => step.kind === 'act' && 'target' in step && 'testId' in step.target && step.target.testId === 'page-add-detail')).toBe(true);
        expect(spec.steps.at(-1)).toMatchObject({ kind: 'assertState', path: 'note.propertyIndex.framework' });
    });

    it('links only registered journeys', () => {
        const { graph } = validateGraph(raw);
        const findings = analyzeGraph(graph!, { journeyIds: new Set(getAllJourneys().map(({ id }) => id)) });
        expect(findings.some(({ issue }) => issue === 'stale-journey-link')).toBe(false);
    });
});
