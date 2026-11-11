import {describe, expect, it} from 'vitest';
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {PropertyNode, findPropertyNode, generatePropertyId} from '../../components/editor/PropertyNode';

const StubPropertyNode = PropertyNode.extend({
    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('span');
            dom.className = 'node-property';
            dom.setAttribute('data-property-id', node.attrs.propertyId);
            dom.textContent = `${node.attrs.name} ${node.attrs.value}`;
            return {dom};
        };
    },
});

const createEditor = (content: string) => new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit, StubPropertyNode],
    content,
});

const CANONICAL = '<p>Working on the scene editor with <span data-type="property" data-name="skill" data-operator="contains" data-value="React"></span></p>';

describe('property chip', () => {
    it('survives the round trip through the editor', () => {
        const editor = createEditor(CANONICAL);

        expect(editor.getHTML()).toBe(CANONICAL);
    });

    it('keeps the seeded property when another one is added', () => {
        const editor = createEditor(CANONICAL);

        editor
            .chain()
            .focus('end')
            .insertContent({
                type: 'property',
                attrs: {propertyId: generatePropertyId(), name: 'rate', operator: 'is', value: '900'},
            })
            .run();

        const html = editor.getHTML();
        expect(html).toContain('data-name="skill"');
        expect(html).toContain('data-name="rate"');
        expect(html.match(/data-type="property"/g)).toHaveLength(2);
    });

    it('finds the chip by its identity', () => {
        const editor = createEditor(CANONICAL);

        const ids: string[] = [];
        editor.state.doc.descendants((node) => {
            if (node.type.name === 'property') ids.push(node.attrs.propertyId);
        });

        const found = findPropertyNode(editor, ids[0]);

        expect(found?.attrs.name).toBe('skill');
        expect(found?.attrs.value).toBe('React');
    });
});
