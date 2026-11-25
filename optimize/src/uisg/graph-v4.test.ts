import { describe, expect, it } from 'vitest';
import { canonicalize, diffGraphs, roundTripTest } from './canonicalize.js';
import { hyperedgeParticipants, hyperedgesFor, indexGraph } from './query.js';
import { UISG_SCHEMA_VERSION, type UisgEdge, type UisgGraph, type UisgHyperedge, type UisgNode } from './types.js';
import { validateGraph } from './validate.js';

const nodes: UisgNode[] = [
    { id: 'intent.test', type: 'intent', name: 'Intent', status: 'implemented' },
    { id: 'cap.a', type: 'capability', name: 'Capability A', status: 'implemented', seam: 'elicit' },
    { id: 'cap.b', type: 'capability', name: 'Capability B', status: 'implemented', seam: 'capture' },
    { id: 'flow.test', type: 'flow', name: 'Flow', status: 'implemented', entry: 'step.act', outcome: 'Done' },
    { id: 'step.act', type: 'step', name: 'Act', status: 'implemented', kind: 'action', action: 'click', target: { testId: 'go' } },
    { id: 'step.done', type: 'step', name: 'Done', status: 'implemented', kind: 'result', statePath: 'done', stateEquals: true },
    { id: 'surface.test', type: 'surface', name: 'Surface', status: 'implemented', component: 'Test' },
    { id: 'surface.other', type: 'surface', name: 'Other surface', status: 'implemented', component: 'Other' },
];

const edges: UisgEdge[] = [
    { from: 'flow.test', type: 'contains', to: 'step.act' },
    { from: 'flow.test', type: 'contains', to: 'step.done' },
    { from: 'step.act', type: 'next', to: 'step.done', when: 'ok' },
    { from: 'step.act', type: 'renders', to: 'surface.test' },
];

const hyperedge = (overrides: Partial<UisgHyperedge> = {}): UisgHyperedge => ({
    id: 'hyper.requires',
    type: 'requiresAll',
    nodes: ['flow.test', 'cap.a', 'cap.b'],
    roles: { flow: 'flow.test', capabilityA: 'cap.a', capabilityB: 'cap.b' },
    ...overrides,
});

const graph = (overrides: Partial<UisgGraph> = {}): UisgGraph => ({
    version: UISG_SCHEMA_VERSION,
    nodes,
    edges,
    hyperedges: [],
    ...overrides,
});

describe('graph v4 hyperedges', () => {
    it('accepts a graph with a hyperedge', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge()] }));
        expect(result.ok).toBe(true);
        expect(result.graph?.hyperedges[0]).toMatchObject({ id: 'hyper.requires', type: 'requiresAll' });
    });

    it('rejects missing participants', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge({ nodes: ['flow.test', 'cap.a', 'cap.missing'] })] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'dangling-hyperedge', ref: 'hyper.requires' }),
        ]));
    });

    it('rejects duplicate participants', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge({ nodes: ['cap.a', 'cap.a', 'cap.b'] })] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'duplicate-hyperedge-node' }),
        ]));
    });

    it('rejects type arity violations', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge({ nodes: ['cap.a'] })] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'hyperedge-arity' }),
        ]));
    });

    it('rejects a role outside the participant set', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge({ roles: { flow: 'flow.test', capabilityA: 'cap.other' } })] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'hyperedge-role' }),
        ]));
    });

    it('rejects duplicate hyperedge ids', () => {
        const result = validateGraph(graph({ hyperedges: [hyperedge(), hyperedge()] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'duplicate-hyperedge-id' }),
        ]));
    });
});

describe('graph v4 additional edges', () => {
    const extra: UisgEdge[] = [
        { from: 'flow.test', type: 'requires', to: 'cap.a' },
        { from: 'cap.a', type: 'provides', to: 'intent.test' },
        { from: 'cap.a', type: 'satisfies', to: 'intent.test' },
        { from: 'cap.a', type: 'dependsOn', to: 'cap.b' },
        { from: 'cap.a', type: 'conflicts', to: 'cap.b' },
        { from: 'cap.a', type: 'excludes', to: 'cap.b' },
        { from: 'flow.test', type: 'composes', to: 'cap.a' },
        { from: 'step.act', type: 'fallback', to: 'step.done' },
        { from: 'step.act', type: 'precedes', to: 'step.done' },
        { from: 'step.act', type: 'parallel', to: 'step.done' },
        { from: 'surface.test', type: 'variantOf', to: 'surface.other' },
        { from: 'surface.test', type: 'overrides', to: 'surface.other' },
        { from: 'flow.test', type: 'evidencedBy', to: 'docs/flow.md' },
        { from: 'flow.test', type: 'documents', to: 'docs/flow.md' },
        { from: 'flow.test', type: 'owns', to: 'step.act' },
        { from: 'flow.test', type: 'tests', to: 'ui/test/flow.test.ts' },
    ];

    it('accepts every binary edge type', () => {
        const result = validateGraph(graph({ edges: [...edges, ...extra] }));
        expect(result.issues.filter(({ code }) => code.startsWith('edge-') || code === 'dangling-edge')).toEqual([]);
        expect(result.ok).toBe(true);
    });

    it('rejects an invalid edge direction', () => {
        const result = validateGraph(graph({ edges: [...edges, { from: 'intent.test', type: 'contains', to: 'step.act' }] }));
        expect(result.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'edge-direction' }),
        ]));
    });
});

describe('graph v4 canonicalization', () => {
    it('sorts participants, role keys, and hyperedges', () => {
        const canon = canonicalize(graph({
            hyperedges: [
                hyperedge({ id: 'hyper.z', nodes: ['cap.b', 'flow.test', 'cap.a'] }),
                hyperedge({ id: 'hyper.a', nodes: ['cap.b', 'cap.a', 'flow.test'], roles: { z: 'cap.b', a: 'cap.a' } }),
            ],
        }));
        expect(canon.hyperedges.map(({ id }) => id)).toEqual(['hyper.a', 'hyper.z']);
        expect(canon.hyperedges[1].nodes).toEqual(['cap.a', 'cap.b', 'flow.test']);
        expect(Object.keys(canon.hyperedges[0].roles!)).toEqual(['a', 'z']);
        expect(JSON.stringify(canonicalize(canon))).toBe(JSON.stringify(canon));
        expect(roundTripTest(graph({ hyperedges: [hyperedge()] }))).toBe(true);
    });

    it('diffs added, removed, and changed hyperedges', () => {
        const before = graph({ hyperedges: [hyperedge()] });
        const after = graph({
            hyperedges: [
                hyperedge({ nodes: ['flow.test', 'cap.b'], roles: { flow: 'flow.test' } }),
                hyperedge({ id: 'hyper.new', type: 'conflictSet', nodes: ['cap.a', 'cap.b'] }),
            ],
        });
        const diff = diffGraphs(before, after);
        expect(diff.addedHyperedges.map(({ id }) => id)).toEqual(['hyper.new']);
        expect(diff.removedHyperedges).toEqual([]);
        expect(diff.changedHyperedges.map(({ before: b }) => b.id)).toEqual(['hyper.requires']);
        expect(diff.semanticChanges).toEqual(expect.arrayContaining([
            'Hyperedge hyper.requires: participants changed',
            'Hyperedge hyper.requires: roles changed',
        ]));
    });
});

describe('graph v4 query', () => {
    it('indexes incident hyperedges and resolves participants', () => {
        const index = indexGraph(graph({ hyperedges: [hyperedge()] }));
        expect(hyperedgesFor(index, 'cap.a').map(({ id }) => id)).toEqual(['hyper.requires']);
        expect(hyperedgesFor(index, 'cap.a', 'conflictSet')).toEqual([]);
        expect(hyperedgeParticipants(index, 'hyper.requires').map(({ id }) => id)).toEqual(['flow.test', 'cap.a', 'cap.b']);
        expect(() => hyperedgeParticipants(index, 'hyper.missing')).toThrow(/not found/);
    });
});
