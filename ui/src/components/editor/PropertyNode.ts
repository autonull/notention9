import {Node, mergeAttributes} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import type {Editor} from '@tiptap/react';
import {PropertyChip} from './PropertyChip';

export const PROPERTY_NODE_NAME = 'property';

export interface PropertyNodeAttrs {
    propertyId: string;
    name: string;
    operator: string;
    value: string;
    icon?: string;
}

export const generatePropertyId = (): string => `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export interface PropertyNodeHandle {
    attrs: PropertyNodeAttrs;
    nodeSize: number;
    pos: number;
}

/** Finds the property chip with this identity in the editor's document. */
export const findPropertyNode = (editor: Editor, propertyId: string): PropertyNodeHandle | null => {
    let found: PropertyNodeHandle | null = null;
    editor.state.doc.descendants((node, pos) => {
        if (found) return false;
        if (node.type.name === PROPERTY_NODE_NAME && node.attrs.propertyId === propertyId) {
            found = {attrs: node.attrs as PropertyNodeAttrs, nodeSize: node.nodeSize, pos};
            return false;
        }
        return true;
    });
    return found;
};

/**
 * The property chip is an inline atom, not a mark: a mark needs text to attach to,
 * and the canonical serialization of a property is an empty span.
 */
export const PropertyNode = Node.create({
    name: PROPERTY_NODE_NAME,

    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            propertyId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-property-id') ?? generatePropertyId(),
                // The identity is editor-local; the canonical serialization does not carry it.
                renderHTML: () => ({}),
            },
            name: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-name') ?? '',
                renderHTML: (attributes) => ({'data-name': attributes.name}),
            },
            operator: {
                default: 'is',
                parseHTML: (element) => element.getAttribute('data-operator') ?? 'is',
                renderHTML: (attributes) => ({'data-operator': attributes.operator}),
            },
            value: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-value') ?? '',
                renderHTML: (attributes) => ({'data-value': attributes.value}),
            },
            icon: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-icon'),
                renderHTML: (attributes) => (attributes.icon ? {'data-icon': attributes.icon} : {}),
            },
        };
    },

    parseHTML() {
        return [
            {tag: 'span[data-type="property"]'},
            {tag: 'span[data-property-id]'},
        ];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes({'data-type': 'property'}, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PropertyChip as any);
    },
});
