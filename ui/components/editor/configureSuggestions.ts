import { ReactRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import tippy, { Instance as TippyInstance, GetReferenceClientRect } from 'tippy.js';
import { SuggestionList, SuggestionItem } from './SuggestionList';

interface SuggestionProps {
  query: string;
  editor: Editor;
  clientRect: any; // Loosen type to avoid Tippy/Tiptap mismatch
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
    items: ({ query }: { query: string }) => {
      return getItems(query);
    },
    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart: (props: SuggestionProps) => {
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

        onUpdate: (props: SuggestionProps) => {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown: (props: SuggestionProps) => {
          if (props.event?.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return (component.ref as SuggestionListRef)?.onKeyDown(props);
        },

        onExit: () => {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };
};
