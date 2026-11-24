import { describe, expect, it } from 'vitest';
import { generateSurface } from './codegen.js';
import type { UisgGraph, UisgSurface } from './types.js';

const surface: UisgSurface = {
    id: 'surface.test',
    name: 'Test item',
    status: 'implemented',
    type: 'surface',
    component: 'TestItem',
    template: 'item',
};

const graph: UisgGraph = { version: 3, nodes: [surface], edges: [] };

describe('multi-target generation', () => {
    it('emits React by default path', () => {
        const result = generateSurface(surface, graph, { target: 'react', write: false });
        expect(result.target).toBe('react');
        expect(result.path).toBe('ui/src/components/items/TestItem.tsx');
        expect(result.testPath).toBe('ui/src/tests/generated/TestItem.test.tsx');
        expect(result.content).toContain('// GENERATED');
    });

    it('emits standalone HTML', () => {
        const result = generateSurface(surface, graph, { target: 'html', write: false });
        expect(result.target).toBe('html');
        expect(result.path).toBe('ui/src/generated/html/TestItem.html');
        expect(result.content).toContain('data-uisg-surface="surface.test"');
        expect(result.testPath).toBe('ui/src/tests/generated/TestItem.html.test.ts');
    });

    it('emits JSON schema', () => {
        const result = generateSurface(surface, graph, { target: 'json', write: false });
        expect(result.target).toBe('json');
        expect(result.path).toBe('ui/src/generated/json/TestItem.json');
        expect(JSON.parse(result.content)).toMatchObject({ surface: 'surface.test', shape: 'item' });
    });

    it('rejects unsupported targets', () => {
        expect(() => generateSurface(surface, graph, { target: 'solid' as never, write: false }))
            .toThrow(/Unsupported component target: solid/);
    });
});
