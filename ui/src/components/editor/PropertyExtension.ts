import {InputRule, mergeAttributes, Node} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {PropertyChip} from './PropertyChip';

export const PropertyExtension = Node.create({
    name: 'property',

    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
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
            isEditing: {
                default: false,
                // We typically don't want isEditing to be persisted in HTML output
                parseHTML: () => false,
                renderHTML: () => ({}),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="property"]',
                getAttrs: (node) => {
                    if (typeof node === 'string') return {};
                    const element = node as HTMLElement;
                    return {
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

    addInputRules() {
        return [
            // Standard format [key:op:val]
            new InputRule({
                find: /\[([^:]+):([^:]+):([^\]]+)\]$/,
                handler: ({state, range, match}) => {
                    const attributes = {
                        name: match[1],
                        operator: match[2],
                        value: match[3],
                    };

                    const {tr} = state;
                    const start = range.from;
                    const end = range.to;

                    tr.replaceWith(start, end, this.type.create(attributes));
                },
            }),
            // Short format [key:val] -> implies 'is'
            new InputRule({
                find: /\[([^:]+):([^:\]]+)\]$/,
                handler: ({state, range, match}) => {
                    const attributes = {
                        name: match[1],
                        operator: 'is',
                        value: match[2],
                    };

                    const {tr} = state;
                    const start = range.from;
                    const end = range.to;

                    tr.replaceWith(start, end, this.type.create(attributes));
                },
            }),
        ];
    },
});
