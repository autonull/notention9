import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canonicalize } from './canonicalize.js';
import { validateGraph } from './validate.js';
import { UISG_SCHEMA_VERSION, type UisgGraph, type UisgSurface } from './types.js';
import {
    archiveVariant, createVariant, diffVariants, exportVariants, listVariants, promoteVariant,
} from './variants.js';

const graph = (version: number): UisgGraph => ({
    version,
    nodes: [{ id: 'surface.test', name: 'Test surface', status: 'implemented', type: 'surface', component: 'Test' }],
    edges: [],
});

describe('graph v3 schema', () => {
    it('rejects v2 graphs', () => {
        const result = validateGraph(graph(2));
        expect(result.ok).toBe(false);
        expect(result.issues[0]).toMatchObject({ code: 'schema', ref: 'version' });
    });

    it('loads v3 graphs with variants', () => {
        const result = validateGraph({
            version: UISG_SCHEMA_VERSION,
            nodes: [{
                id: 'surface.test', name: 'Test surface', status: 'implemented', type: 'surface', component: 'Test',
                defaultVariant: 'dense',
                variants: {
                    dense: { description: 'Dense', status: 'experimental', template: 'item-dense' },
                },
            }],
            edges: [],
        });
        expect(result.ok).toBe(true);
        expect((result.graph!.nodes[0] as UisgSurface).variants!.dense.template).toBe('item-dense');
    });

    it('canonicalizes variant maps deterministically', () => {
        const canon = canonicalize({
            version: UISG_SCHEMA_VERSION,
            nodes: [{
                id: 'surface.test', name: 'Test surface', status: 'implemented', type: 'surface', component: 'Test',
                defaultVariant: 'dense',
                variants: {
                    sparse: { description: 'Sparse', status: 'candidate', template: 'item-sparse' },
                    dense: { description: 'Dense', status: 'experimental', template: 'item-dense', strategyOverrides: { layout: 'stacked', display: 'inline' } },
                },
            }],
            edges: [],
        });
        const surface = canon.nodes[0] as UisgSurface;
        expect(Object.keys(surface.variants!)).toEqual(['dense', 'sparse']);
        expect(Object.keys(surface.variants!.dense.strategyOverrides!)).toEqual(['display', 'layout']);
        expect(JSON.stringify(canonicalize(canon))).toBe(JSON.stringify(canon));
    });
});

describe('variant registry', () => {
    let dir: string;
    let file: string;
    const previous = process.env.NOTENTION_UISG_VARIANTS;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'uisg-variants-'));
        file = join(dir, 'variants.json');
        process.env.NOTENTION_UISG_VARIANTS = file;
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
        if (previous === undefined) delete process.env.NOTENTION_UISG_VARIANTS;
        else process.env.NOTENTION_UISG_VARIANTS = previous;
    });

    it('supports create, list, promote, archive, diff, and export', () => {
        createVariant('surface.test', 'dense', { description: 'Dense list', template: 'item-dense' });
        createVariant('surface.test', 'sparse', { description: 'Sparse list' });

        expect(listVariants({ surface: 'surface.test' }).map(({ id }) => id)).toEqual(['dense', 'sparse']);
        expect(() => createVariant('surface.test', 'dense')).toThrow(/already exists/);
        expect(createVariant('surface.test', 'dense-copy', {}, 'dense').template).toBe('item-dense');

        const promoted = promoteVariant('surface.test', 'dense', { bundleKb: 12, f1: 0.91, taskTimeMs: 800, visualPass: true });
        expect(promoted).toMatchObject({ status: 'promoted', metrics: { bundleKb: 12, visualPass: true } });
        expect(promoted.promotedAt).toBeDefined();

        const diff = diffVariants('surface.test', 'dense', 'sparse');
        expect(diff.changes.map(({ field }) => field)).toEqual(expect.arrayContaining(['template', 'status']));

        expect(exportVariants('surface.test', 'json')).toContain('"dense"');
        expect(exportVariants('surface.test', 'md')).toContain('| dense | promoted |');

        const archived = archiveVariant('surface.test', 'sparse');
        expect(archived.status).toBe('archived');
        expect(listVariants({ surface: 'surface.test', status: 'archived' }).map(({ id }) => id)).toEqual(['sparse']);
    });

    it('rejects unknown variants', () => {
        expect(() => promoteVariant('surface.test', 'missing')).toThrow(/not found/);
    });
});
