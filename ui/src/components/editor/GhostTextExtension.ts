import {Extension, InputRule} from '@tiptap/core';

// Enhanced patterns for natural language injection
const GHOST_PATTERNS = [
    {
        regex: /^(Buy|Get|Purchase) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:buy] [item:${match[2]}]`
    },
    {
        regex: /^(Call|Phone|Ring) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:call] [person:${match[2]}]`
    },
    {
        regex: /^(Email|Mail|Write to) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:email] [person:${match[2]}]`
    },
    {
        regex: /^(Meet|Meeting with) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:meeting] [attendee:${match[2]}]`
    },
    {
        regex: /^(Remind me to|Task) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:todo] [desc:${match[2]}]`
    },
    {
        regex: /^(Research|Look up) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[task:research] [topic:${match[2]}]`
    },
    {
        regex: /^(Idea|Note) (.+)$/i,
        handler: (match: RegExpMatchArray) => `[type:idea] [content:${match[2]}]`
    }
];

export const GhostTextExtension = Extension.create({
    name: 'ghostText',

    addInputRules() {
        return GHOST_PATTERNS.map(pattern =>
            new InputRule({
                find: pattern.regex,
                handler: ({state, range, match}) => {
                    const replacement = pattern.handler(match);
                    if (replacement) {
                        const start = range.from;
                        const end = range.to;
                        state.tr.insertText(replacement, start, end);
                    }
                }
            })
        );
    },
});
