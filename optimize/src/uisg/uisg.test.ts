import { readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
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
import { collectMetrics, loadMetrics } from './metrics.js';
import { rankItems, loadPriority } from './rank.js';
import { selectFeature, loadSelection } from './select.js';
import { loadGraph } from './cli.js';
import { canonicalize, roundTripTest, diffGraphs } from './canonicalize.js';
import { appendRunRecord, loadRuns, appendDecision, loadDecisions, appendFinding, loadFindings, markFindingFixed, verifyFinding, transitionLifecycle } from './records.js';
import { adoptFlow } from './adopt.js';
import { loadRegressionCatalogue, runSeededRegressions } from './regressions.js';
import { buildManifest, loadManifest } from './manifest.js';
import { buildComponentRegistry, validateAgainstRegistry } from './registry.js';

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

describe('collectMetrics', () => {
    const file = '/tmp/opencode/uisg-metrics.json';

    it('collects metrics and writes to file', () => {
        const metrics = collectMetrics(7, file);
        expect(metrics.version).toBe(1);
        expect(metrics.generatedAt).toBeDefined();
        expect(Array.isArray(metrics.friction)).toBe(true);
        expect(Array.isArray(metrics.loopLatency)).toBe(true);
        expect(Array.isArray(metrics.probe)).toBe(true);
        expect(Array.isArray(metrics.evalMatch)).toBe(true);
        expect(Array.isArray(metrics.uxEvaluate)).toBe(true);
        expect(Array.isArray(metrics.driftFindings)).toBe(true);
        expect(Array.isArray(metrics.failingAssertions)).toBe(true);
    });

    it('loads metrics from file', () => {
        const loaded = loadMetrics(file);
        expect(loaded).not.toBeNull();
        expect(loaded!.version).toBe(1);
    });
});

describe('rankItems', () => {
    const file = '/tmp/opencode/uisg-priority.json';

    it('ranks items and writes priority.json', () => {
        const priority = rankItems('default', file);
        expect(priority.version).toBe(1);
        expect(priority.weightProfile).toBe('default');
        expect(Array.isArray(priority.items)).toBe(true);
        // Should have at least some items
        expect(priority.items.length).toBeGreaterThan(0);
        // Each item should have required fields
        for (const item of priority.items) {
            expect(item.nodeId).toBeDefined();
            expect(item.type).toBeDefined();
            expect(item.name).toBeDefined();
            expect(typeof item.score).toBe('number');
            expect(typeof item.impact).toBe('number');
            expect(typeof item.confidence).toBe('number');
            expect(typeof item.effort).toBe('number');
            expect(Array.isArray(item.reasons)).toBe(true);
            expect(Array.isArray(item.evidence)).toBe(true);
        }
    });

    it('loads priority from file', () => {
        const loaded = loadPriority(file);
        expect(loaded).not.toBeNull();
        expect(loaded!.version).toBe(1);
    });

    it('sorts by score descending with type order tie-break', () => {
        const priority = rankItems('default', file);
        for (let i = 1; i < priority.items.length; i++) {
            const prev = priority.items[i - 1];
            const curr = priority.items[i];
            expect(prev.score).toBeGreaterThanOrEqual(curr.score);
            if (prev.score === curr.score) {
                const typeOrder: Record<string, number> = { flow: 0, capability: 1, surface: 2, step: 3, intent: 4, predicate: 5, effect: 6 };
                expect((typeOrder[prev.type] ?? 99)).toBeLessThanOrEqual((typeOrder[curr.type] ?? 99));
            }
        }
    });
});

describe('selectFeature', () => {
    const file = '/tmp/opencode/uisg-selection.json';

    it('selects a feature and writes selection.json', () => {
        const result = selectFeature({ feature: 'inline-detail' }, file);
        expect(result.request.feature).toBe('inline-detail');
        expect(Array.isArray(result.selected)).toBe(true);
        expect(result.explanation).toBeDefined();
        expect(Array.isArray(result.conflicts)).toBe(true);
        expect(typeof result.satisfied).toBe('boolean');
    });

    it('loads selection from file', () => {
        const loaded = loadSelection(file);
        expect(loaded).not.toBeNull();
        expect(loaded!.request.feature).toBe('inline-detail');
    });

    it('returns conflicts for non-existent feature', () => {
        const result = selectFeature({ feature: 'non-existent-feature-xyz' });
        expect(result.satisfied).toBe(false);
        expect(result.selected).toHaveLength(0);
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.conflicts[0].type).toBe('requires');
        expect(result.explanation).toContain('non-existent-feature-xyz');
    });

    it('allows selection of rejected nodes (soft lifecycle conflict)', () => {
        // cap.intent.recognize is rejected in the graph but can still be selected
        const result = selectFeature({ feature: 'intent.recognize' });
        expect(result.satisfied).toBe(true);
        expect(result.selected).toContain('cap.intent.recognize');
        // Lifecycle conflicts for 'rejected' are soft (not blocking) - not in conflicts array
        // but the node status is tracked in the graph
    });
});

const testGraph: UisgGraph = {
    version: 1,
    nodes: [
        { id: 'flow.test', type: 'flow', name: 'Test flow', status: 'candidate', entry: 'step.act', outcome: 'Done.' },
        { id: 'cap.test', type: 'capability', name: 'Test capability', status: 'implemented', seam: 'elicit', source: [] },
    ],
    edges: [
        { from: 'flow.test', type: 'uses', to: 'cap.test' },
    ],
};

const testEvidence: EvidenceBundle = {
    source: 'test-derived',
    refs: ['run-123'],
    date: new Date().toISOString(),
    confidence: 'high',
};

describe('records', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
    const ledgerFiles = ['decisions', 'findings', 'runs'].map(name => resolve(root, 'doc/uisg', `${name}.jsonl`));
    const originals = new Map(ledgerFiles.map(file => [file, existsSync(file) ? readFileSync(file, 'utf8') : null]));
    afterAll(() => {
        for (const [file, content] of originals) {
            if (content === null) rmSync(file, { force: true });
            else writeFileSync(file, content);
        }
    });

    it('appends run records and loads them', () => {
        const record = {
            flowId: 'flow.test',
            runId: 'test-run-1',
            bundlePath: 'data/loop/runs/run-test/bundle.json',
            status: 'passed' as const,
            timestamp: new Date().toISOString(),
        };
        appendRunRecord(record);
        const runs = loadRuns();
        expect(runs.length).toBeGreaterThan(0);
        expect(runs.some(r => r.runId === 'test-run-1')).toBe(true);
    });

    it('appends decision records and loads them', () => {
        const record = {
            flowId: 'flow.test',
            variantId: 'variant-1',
            hypothesis: 'Test hypothesis',
            metric: 'friction',
            baselineRunId: 'run-1',
            variantRunId: 'run-2',
            comparison: '{}',
            decision: 'adopt' as const,
            adoptedAt: new Date().toISOString(),
            evidence: testEvidence,
            actor: 'test-actor',
        };
        appendDecision(record);
        const decisions = loadDecisions();
        expect(decisions.length).toBeGreaterThan(0);
        expect(decisions.some(d => d.flowId === 'flow.test')).toBe(true);
    });

    it('appends findings and loads them', () => {
        const finding = appendFinding({
            issue: 'Test issue',
            evidence: ['evidence-1'],
            impact: 'Test impact',
            suggestedChange: 'Fix it',
            severity: 'high',
            nodeId: 'flow.test',
            status: 'open',
        });
        expect(finding.id).toBeDefined();
        expect(finding.createdAt).toBeDefined();
        expect(finding.status).toBe('open');

        const findings = loadFindings();
        expect(findings.some(f => f.id === finding.id)).toBe(true);
    });

    it('marks finding as fixed and verified', () => {
        const finding = appendFinding({
            issue: 'Test issue 2',
            evidence: ['evidence-2'],
            impact: 'Test impact 2',
            suggestedChange: 'Fix it 2',
            severity: 'medium',
            nodeId: 'flow.test',
            status: 'open',
        });

        const fixed = markFindingFixed(finding.id, 'test-actor', 'run-verify');
        expect(fixed).not.toBeNull();
        expect(fixed!.status).toBe('fixed');
        expect(fixed!.fixedBy).toBe('test-actor');
        expect(fixed!.verificationRunId).toBe('run-verify');

        const verified = verifyFinding(finding.id, 'run-verify');
        expect(verified).not.toBeNull();
        expect(verified!.status).toBe('verified');
    });

    it('enforces lifecycle transition legality', () => {
        // Valid transition: candidate -> planned
        let result = transitionLifecycle(testGraph, 'flow.test', 'planned', 'actor', 'reason', testEvidence, 'impact');
        expect(result.transition.from).toBe('candidate');
        expect(result.transition.to).toBe('planned');

        // Valid transition: planned -> implemented
        result = transitionLifecycle(result.graph, 'flow.test', 'implemented', 'actor', 'reason', testEvidence, 'impact');
        expect(result.transition.from).toBe('planned');
        expect(result.transition.to).toBe('implemented');

        // Invalid transition: implemented -> candidate (not allowed)
        expect(() => transitionLifecycle(result.graph, 'flow.test', 'candidate', 'actor', 'reason', testEvidence, 'impact'))
            .toThrow(/Invalid lifecycle transition/);

        // Invalid transition: removed -> anything (not allowed)
        const removedGraph = { ...testGraph, nodes: [...testGraph.nodes, { id: 'flow.removed', type: 'flow' as const, name: 'Removed', status: 'removed' as const, entry: 'step.x', outcome: 'x' }] };
        expect(() => transitionLifecycle(removedGraph, 'flow.removed', 'implemented', 'actor', 'reason', testEvidence, 'impact'))
            .toThrow(/Invalid lifecycle transition/);
    });

    it('appends lifecycle transition to decisions.jsonl', () => {
        const graph: UisgGraph = {
            version: 1,
            nodes: [
                { id: 'flow.transition', type: 'flow', name: 'Transition flow', status: 'planned', entry: 'step.act', outcome: 'Done.' },
            ],
            edges: [],
        };
        transitionLifecycle(graph, 'flow.transition', 'implemented', 'actor', 'reason', testEvidence, 'impact');
        const decisions = loadDecisions();
        const lifecycleDecision = decisions.find(d => (d as any).type === 'lifecycle' && (d as any).nodeId === 'flow.transition');
        expect(lifecycleDecision).toBeDefined();
        expect((lifecycleDecision as any).from).toBe('planned');
        expect((lifecycleDecision as any).to).toBe('implemented');
    });
});

describe('round-trip canonicalization', () => {
    it('canonicalizes graph and verifies round-trip', () => {
        const graph = loadGraph(new Map());
        const canonical = canonicalize(graph);
        const canonicalAgain = canonicalize(canonical);
        expect(JSON.stringify(canonicalAgain)).toBe(JSON.stringify(canonical));
    });

    it('roundTripTest returns true for valid graph', () => {
        const graph = loadGraph(new Map());
        expect(roundTripTest(graph)).toBe(true);
    });
});

describe('diff', () => {
    it('computes semantic diff between two graphs', () => {
        const graph = loadGraph(new Map());
        const diff = diffGraphs(graph, graph);
        expect(diff).toBeDefined();
        expect(Array.isArray(diff.addedNodes)).toBe(true);
        expect(Array.isArray(diff.removedNodes)).toBe(true);
        expect(Array.isArray(diff.changedNodes)).toBe(true);
        expect(Array.isArray(diff.addedEdges)).toBe(true);
        expect(Array.isArray(diff.removedEdges)).toBe(true);
        expect(Array.isArray(diff.semanticChanges)).toBe(true);
    });
});

describe('adoptFlow', () => {
    it('rejects adoption when bundles not found', () => {
        const result = adoptFlow({
            flowId: 'flow.test',
            baselineRunId: 'nonexistent-1',
            variantRunId: 'nonexistent-2',
            hypothesis: 'Test',
            metric: 'friction',
            expectedEffect: 'reduce friction',
            actor: 'test',
            evidence: testEvidence,
        });
        expect(result.success).toBe(false);
        expect(result.decision).toBe('reject');
        expect(result.error).toBeDefined();
    });
});

describe('seeded regressions', () => {
    const file = fileURLToPath(new URL('../../../doc/uisg/graph.json', import.meta.url));
    const graph = validateGraph(JSON.parse(readFileSync(file, 'utf8'))).graph!;
    const catalogue = loadRegressionCatalogue();
    const journeyIds = new Set(getAllJourneys().map(({ id }) => id));

    it('detects every seeded regression', () => {
        const outcomes = runSeededRegressions(graph, catalogue, journeyIds);
        expect(outcomes).toHaveLength(catalogue.seeds.length);
        expect(outcomes.filter(outcome => !outcome.detected)).toEqual([]);
    });

    it('covers integrity, traceability, flow-state, and a11y families', () => {
        expect(new Set(catalogue.seeds.map(seed => seed.family))).toEqual(
            new Set(['integrity', 'traceability', 'flow-state', 'a11y-ergonomics'])
        );
    });

    it('leaves the unmutated graph clean', () => {
        expect(analyzeGraph(graph, { journeyIds })).toEqual([]);
    });
});

describe('canonicalization fidelity', () => {
    const withExtras = (): UisgGraph => {
        const graph = clone();
        (graph.nodes[0] as unknown as Record<string, unknown>).owner = 'design';
        return graph;
    };

    it('preserves unknown fields by default', () => {
        const canon = canonicalize(withExtras());
        expect((canon.nodes.find(node => node.id === 'intent.test') as unknown as Record<string, unknown>).owner).toBe('design');
    });

    it('strips unknown fields when configured', () => {
        const canon = canonicalize(withExtras(), { schemaVersion: 1, unknownFieldPolicy: 'strip' });
        expect((canon.nodes[0] as unknown as Record<string, unknown>).owner).toBeUndefined();
    });

    it('rejects unknown fields when configured', () => {
        expect(() => canonicalize(withExtras(), { schemaVersion: 1, unknownFieldPolicy: 'error' })).toThrow(/Unknown fields on intent.test: owner/);
    });

    it('preserves ids, edges, lifecycle, and provenance through a migration', () => {
        const file = fileURLToPath(new URL('../../../doc/uisg/graph.json', import.meta.url));
        const raw = validateGraph(JSON.parse(readFileSync(file, 'utf8'))).graph!;
        const canon = canonicalize(raw);

        expect(canon.nodes.map(node => node.id)).toEqual([...raw.nodes.map(node => node.id)].sort());
        expect(canon.edges.map(edge => `${edge.from}|${edge.type}|${edge.to}|${edge.when ?? ''}`))
            .toEqual(raw.edges.map(edge => `${edge.from}|${edge.type}|${edge.to}|${edge.when ?? ''}`).sort());

        for (const node of raw.nodes) {
            const migrated = canon.nodes.find(candidate => candidate.id === node.id)!;
            expect(migrated).toMatchObject({ status: node.status });
            expect(migrated.source ?? []).toEqual([...(node.source ?? [])].sort());
            if (node.type === 'flow' && migrated.type === 'flow') expect(migrated.journey).toBe(node.journey);
            if (node.type === 'capability' && migrated.type === 'capability') expect(migrated.strategy).toBe(node.strategy);
        }
    });
});

describe('manifest determinism', () => {
    it('emits identical manifests for identical inputs', () => {
        const spec = getJourney('golden-path')!;
        const first = buildManifest('flow.golden-path', spec);
        const second = buildManifest('flow.golden-path', spec);
        expect(first.contentHash).toBe(second.contentHash);
        expect({ ...first, generatedAt: '' }).toEqual({ ...second, generatedAt: '' });
    });

    it('keeps the recorded manifest in sync with its flow', () => {
        const file = fileURLToPath(new URL('../../../doc/uisg/graph.json', import.meta.url));
        const { graph } = validateGraph(JSON.parse(readFileSync(file, 'utf8')));
        const manifest = loadManifest('flow.golden-path');
        expect(manifest).not.toBeNull();
        const spec = flowToJourney(graph!, 'flow.golden-path', { seed: getJourney('golden-path')!.seed });
        expect(manifest!.spec).toEqual(spec);
        expect(manifest!.contentHash).toBe(buildManifest('flow.golden-path', spec).contentHash);
    });
});

describe('registry validation', () => {
    const registry = buildComponentRegistry();

    it('only requires components for implemented surfaces', () => {
        const graph = clone();
        graph.nodes.push(
            { id: 'surface.planned-ghost', type: 'surface', name: 'PlannedGhost', status: 'planned', component: 'PlannedGhost' },
            { id: 'surface.removed-ghost', type: 'surface', name: 'RemovedGhost', status: 'removed', component: 'RemovedGhost' }
        );
        expect(validateAgainstRegistry(graph, registry)).toEqual({ ok: true, errors: [] });
    });

    it('flags an implemented surface with no component', () => {
        const graph = clone();
        graph.nodes.push({ id: 'surface.missing', type: 'surface', name: 'Missing', status: 'implemented', component: 'Missing' });
        expect(validateAgainstRegistry(graph, registry).errors).toEqual([
            'Surface surface.missing references unknown component Missing',
        ]);
    });

    it('accepts the real graph', () => {
        const file = fileURLToPath(new URL('../../../doc/uisg/graph.json', import.meta.url));
        const graph = validateGraph(JSON.parse(readFileSync(file, 'utf8'))).graph!;
        expect(validateAgainstRegistry(graph, registry)).toEqual({ ok: true, errors: [] });
    });
});
