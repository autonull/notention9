import {ReactRenderer} from '@tiptap/react';
import type {Editor} from '@tiptap/core';
import tippy, {Instance as TippyInstance} from 'tippy.js';
import {SuggestionItem, SuggestionList} from './SuggestionList';

interface SuggestionProps {
    query: string;
    editor: Editor;
    clientRect: any;
    event?: KeyboardEvent;
    text: string;
    range: { from: number; to: number };
}

interface SuggestionListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const configureSuggestions = (
    getItems: (query: string) => SuggestionItem[],
    char: string
) => {
    return {
        char,
        items: (query: string) => {
            return getItems(query);
        },
        render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(SuggestionList, {
                        props,
                        editor: props.editor,
                    });

                    if (!props.clientRect) {
                        return;
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                    });
                },

                onUpdate: (props: any) => {
                    component.updateProps(props);

                    if (!props.clientRect) {
                        return;
                    }

                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },

                onKeyDown: (props: any) => {
                    if (props.event?.key === 'Escape') {
                        popup[0].hide();
                        return true;
                    }

                    return (component.ref as SuggestionListRef)?.onKeyDown({event: props.event!});
                },

                onExit: () => {
                    if (popup && popup[0]) {
                        popup[0].destroy();
                    }
                    if (component) {
                        component.destroy();
                    }
                },
            };
        },
    } as const;
};
