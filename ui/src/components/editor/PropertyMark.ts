import {Mark, mergeAttributes} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {PropertyChip} from './PropertyChip';

export const PropertyMark = Mark.create({
    name: 'propertyMark',

    inclusive: false,

    addAttributes() {
        return {
            propertyId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-property-id'),
                renderHTML: (attributes) => {
                    if (!attributes.propertyId) return {};
                    return {'data-property-id': attributes.propertyId};
                },
            },
            name: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-name'),
                renderHTML: (attributes) => {
                    if (!attributes.name) return {};
                    return {'data-name': attributes.name};
                },
            },
            operator: {
                default: 'is',
                parseHTML: (element) => element.getAttribute('data-operator'),
                renderHTML: (attributes) => {
                    return {'data-operator': attributes.operator};
                },
            },
            value: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-value'),
                renderHTML: (attributes) => {
                    if (!attributes.value) return {};
                    return {'data-value': attributes.value};
                },
            },
            icon: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-icon'),
                renderHTML: (attributes) => {
                    if (!attributes.icon) return {};
                    return {'data-icon': attributes.icon};
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-property-id]',
                getAttrs: (node) => {
                    if (typeof node === 'string') return {};
                    const element = node as HTMLElement;
                    return {
                        propertyId: element.getAttribute('data-property-id'),
                        name: element.getAttribute('data-name'),
                        operator: element.getAttribute('data-operator'),
                        value: element.getAttribute('data-value'),
                        icon: element.getAttribute('data-icon'),
                    };
                },
            },
            // Backward compat with old data-type="property"
            {
                tag: 'span[data-type="property"]',
                getAttrs: (node) => {
                    if (typeof node === 'string') return {};
                    const element = node as HTMLElement;
                    return {
                        propertyId: element.getAttribute('data-name'), // use name as ID for legacy
                        name: element.getAttribute('data-name'),
                        operator: element.getAttribute('data-operator'),
                        value: element.getAttribute('data-value'),
                        icon: element.getAttribute('data-icon'),
                    };
                },
            },
        ];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-type': 'property'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PropertyChip);
    },
});