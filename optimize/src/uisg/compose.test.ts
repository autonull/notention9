import { describe, it, expect } from 'vitest';
import {
    compose,
    primitive,
    sequence,
    conditional,
    slot,
    registerComposedTemplate,
    MatchItemComposition,
    DenseMatchItemComposition,
    generateComposedComponent,
    generateComposedPropsSchema,
} from './compose.js';
import { getTemplate } from './templates/index.js';
import type { UisgSurface, UisgGraph, TemplateTarget } from './types.js';

const mockSurface: UisgSurface = {
    id: 'surface.testmatch',
    name: 'Test Match',
    type: 'surface',
    status: 'implemented',
    component: 'TestMatch',
    route: '#/test',
    summary: 'Test match surface',
    template: 'item',
    configKey: 'TEST_MATCH',
    propsSchema: {},
};

const mockGraph: UisgGraph = {
    version: 3,
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
};

describe('Composition DSL', () => {
    it('creates a composed template', () => {
        const composed = compose(
            sequence([
                primitive('Card', [{ key: 'testId', value: 'test' }], []),
            ])
        );
        expect(composed.shape).toBe('item');
        expect(composed.composition.type).toBe('sequence');
    });

    it('MatchItemComposition has correct structure', () => {
        expect(MatchItemComposition.shape).toBe('item');
        expect(MatchItemComposition.name).toBe('composed');
        expect(MatchItemComposition.composition.type).toBe('sequence');
    });

    it('DenseMatchItemComposition has fewer elements', () => {
        expect(DenseMatchItemComposition.shape).toBe('item');
    });

    it('generates React component', () => {
        const component = generateComposedComponent(mockSurface, mockGraph, 'react', MatchItemComposition);
        expect(component).toContain('export function TestMatch(');
        expect(component).toContain('isLocal: boolean');
        expect(component).toContain('useState(false)');
        expect(component).toContain('Card');
    });

    it('generates HTML component', () => {
        const component = generateComposedComponent(mockSurface, mockGraph, 'html', MatchItemComposition);
        expect(component).toContain('<!doctype html>');
        expect(component).toContain('data-uisg-surface="surface.testmatch"');
    });

    it('generates JSON component', () => {
        const component = generateComposedComponent(mockSurface, mockGraph, 'json', MatchItemComposition);
        expect(component).toContain('surface.testmatch');
    });

    it('generates props schema', () => {
        const schema = generateComposedPropsSchema(mockSurface, mockGraph, MatchItemComposition);
        expect(schema).toContain('z.object({');
        expect(schema).toContain('match: z.object({');
        expect(schema).toContain('surface_testmatch_PropsSchema');
    });

    it('registers composed template', () => {
        registerComposedTemplate(MatchItemComposition);
        const template = getTemplate('item');
        expect(template).toBeDefined();
        expect(template?.name).toBe('composed');
    });

    it('primitive helper creates correct structure', () => {
        const card = primitive('Card', [{ key: 'testId', value: 'my-card' }], []);
        expect(card.type).toBe('primitive');
        expect(card.primitive?.type).toBe('Card');
        expect(card.primitive?.props).toEqual([{ key: 'testId', value: 'my-card' }]);
    });

    it('sequence helper creates correct structure', () => {
        const seq = sequence([
            primitive('Card', [], []),
            primitive('Header', [], []),
        ]);
        expect(seq.type).toBe('sequence');
        expect(seq.items?.length).toBe(2);
    });

    it('conditional helper creates correct structure', () => {
        const cond = conditional('showDetails', primitive('Body', [], []), primitive('Text', [], []));
        expect(cond.type).toBe('conditional');
        expect(cond.condition).toBe('showDetails');
        expect(cond.thenBranch?.type).toBe('primitive');
        expect(cond.elseBranch?.type).toBe('primitive');
    });

    it('slot helper creates correct structure', () => {
        const slotComp = slot('custom', [primitive('Text', [{ key: 'content', value: 'default' }], [])]);
        expect(slotComp.type).toBe('slot');
        expect(slotComp.slotName).toBe('custom');
    });
});