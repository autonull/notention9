import {Extension, InputRule} from '@tiptap/core';

export const GhostTextExtension = Extension.create({
    name: 'ghostText',

    addInputRules() {
        return [
            new InputRule({
                find: /^(Buy|Call|Email|Meet) (.+)$/i,
                handler: ({state, range, match}) => {
                    const action = match[1].toLowerCase();
                    const object = match[2];

                    let replacement = '';
                    if (action === 'buy') {
                        replacement = `[` + `task:buy] [item:${object}]`;
                    } else if (action === 'call') {
                        replacement = `[` + `task:call] [person:${object}]`;
                    } else if (action === 'email') {
                        replacement = `[` + `task:email] [person:${object}]`;
                    } else if (action === 'meet') {
                        replacement = `[` + `task:meeting] [attendee:${object}]`;
                    }

                    if (replacement) {
                        const start = range.from;
                        const end = range.to;
                        state.tr.insertText(replacement, start, end);
                    }
                }
            })
        ];
    },
});
