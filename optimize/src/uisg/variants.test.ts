import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canonicalize, migrateGraph } from './canonicalize.js';
import type { UisgGraph, UisgSurface } from './types.js';
import {
    archiveVariant, createVariant, diffVariants, exportVariants, listVariants, promoteVariant,
} from './variants.js';

const v2 = (): UisgGraph => ({
    version: 2,
    nodes: [{ id: 'surface.test', name: 'Test surface', status: 'implemented', type: 'surface', component: 'Test' }],
    edges: [],
});

describe('graph v3 migration', () => {
    it('migrates v2 surfaces to v3 with empty variants', () => {
        const result = migrateGraph(v2());
        expect(result).toMatchObject({ migrated: true, from: 2 });
        expect(result.graph.version).toBe(3);
        expect((result.graph.nodes[0] as UisgSurface).variants).toEqual({});
    });

    it('leaves v3 graphs untouched', () => {
        const graph = { ...v2(), version: 3 };
        const result = migrateGraph(graph);
        expect(result.migrated).toBe(false);
        expect(result.graph).toBe(graph);
    });

    it('canonicalizes variant maps deterministically', () => {
        const graph: UisgGraph = {
            version: 3,
            nodes: [{
                id: 'surface.test', name: 'Test surface', status: 'implemented', type: 'surface', component: 'Test',
                defaultVariant: 'dense',
                variants: {
                    sparse: { description: 'Sparse', status: 'candidate', template: 'item-sparse' },
                    dense: { description: 'Dense', status: 'experimental', template: 'item-dense', strategyOverrides: { layout: 'stacked', display: 'inline' } },
                },
            }],
            edges: [],
        };
        const canon = canonicalize(graph);
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
