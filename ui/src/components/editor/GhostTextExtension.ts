import {Extension, InputRule} from '@tiptap/core';
import type {Node as ProseMirrorNode, Schema} from '@tiptap/pm/model';
import type {Property} from '@notention/core';

interface GhostPattern {
    regex: RegExp;
    properties: (match: RegExpMatchArray) => Property[];
}

const property = (key: string, values: string[], operator = 'is'): Property => ({key, operator, values});

const GHOST_PATTERNS: GhostPattern[] = [
    {regex: /^(Buy|Get|Purchase) (.+)$/i, properties: m => [property('task', ['buy']), property('item', [m[2]])]},
    {regex: /^(Call|Phone|Ring) (.+)$/i, properties: m => [property('task', ['call']), property('person', [m[2]])]},
    {regex: /^(Email|Mail|Write to) (.+)$/i, properties: m => [property('task', ['email']), property('person', [m[2]])]},
    {regex: /^(Meet|Meeting with) (.+)$/i, properties: m => [property('task', ['meeting']), property('attendee', [m[2]])]},
    {regex: /^(Remind me to|Task) (.+)$/i, properties: m => [property('task', ['todo']), property('description', [m[2]])]},
    {regex: /^(Research|Look up) (.+)$/i, properties: m => [property('task', ['research']), property('topic', [m[2]])]},
    {regex: /^(Idea|Note) (.+)$/i, properties: m => [property('type', ['idea']), property('content', [m[2]])]},
    {regex: /^(Schedule|Book) (.+) at (.+)$/i, properties: m => [property('action', [m[1].toLowerCase()]), property('event', [m[2]]), property('time', [m[3]])]},
    {regex: /^(Go to|Travel to|Visit) (.+)$/i, properties: m => [property('action', ['travel']), property('destination', [m[2]])]},
];

const propertyNodes = (schema: Schema, properties: Property[]): ProseMirrorNode[] =>
    properties.flatMap(p => [
        schema.nodes.property.create({name: p.key, operator: p.operator, value: p.values.join(', ')}),
        schema.text(' '),
    ]);

export const GhostTextExtension = Extension.create({
    name: 'ghostText',

    addInputRules() {
        return GHOST_PATTERNS.map(pattern =>
            new InputRule({
                find: pattern.regex,
                handler: ({state, range, match}) => {
                    const nodes = [state.schema.text(`${match[0]} `), ...propertyNodes(state.schema, pattern.properties(match))];
                    state.tr.replaceWith(range.from, range.to, nodes);
                }
            })
        );
    },
});
