import type {Editor} from '@tiptap/react';

export type FormatAction = 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'quote' | 'code' | 'divider';

/** One place for block formatting, shared by the slash menu and the toolbar menu. */
export function applyFormat(editor: Editor, action: FormatAction): void {
    const chain = editor.chain().focus();
    switch (action) {
        case 'h1': chain.toggleHeading({level: 1}).run(); break;
        case 'h2': chain.toggleHeading({level: 2}).run(); break;
        case 'h3': chain.toggleHeading({level: 3}).run(); break;
        case 'bullet': chain.toggleBulletList().run(); break;
        case 'numbered': chain.toggleOrderedList().run(); break;
        case 'quote': chain.toggleBlockquote().run(); break;
        case 'code': chain.toggleCodeBlock().run(); break;
        case 'divider': chain.setHorizontalRule().run(); break;
    }
}
