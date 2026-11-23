import React from 'react';
import {Editor} from '@tiptap/react';
import {BubbleMenu as BubbleMenuComponent} from '@tiptap/react/menus';
import {BoldIcon, CodeBracketsIcon, ItalicIcon, LinkIcon, QuoteIcon, StrikethroughIcon} from '../ui/icons';

interface EditorBubbleMenuProps {
    editor: Editor | null;
}

const BubbleButton = ({
                          onClick,
                          isActive,
                          icon: Icon,
                          title,
                      }: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) => (
    <button
        onClick={onClick}
        className={`grid h-7 w-7 place-items-center transition-colors ${
            isActive
                ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]'
                : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]'
        }`}
        title={title}
        aria-label={title}
        aria-pressed={isActive}
        type="button"
    >
        <Icon className="h-3.5 w-3.5"/>
    </button>
);

const BubbleMenu = BubbleMenuComponent as any;

export function EditorBubbleMenu({editor}: EditorBubbleMenuProps) {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 overflow-hidden rounded-lg border border-[var(--app-line)] bg-[var(--app-raised)] p-1 shadow-[var(--app-shadow)]"
        >
            <BubbleButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={BoldIcon}
                title="Bold"
            />
            <BubbleButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={ItalicIcon}
                title="Italic"
            />
            <BubbleButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                icon={StrikethroughIcon}
                title="Strikethrough"
            />
            <div className="mx-0.5 h-4 w-px bg-[var(--app-line)]"/>
            <BubbleButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                icon={CodeBracketsIcon}
                title="Code"
            />
            <BubbleButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                icon={QuoteIcon}
                title="Blockquote"
            />
            <BubbleButton
                onClick={() => {
                    const previousUrl = editor.getAttributes('link').href;
                    const url = window.prompt('URL', previousUrl);

                    // cancelled
                    if (url === null) {
                        return;
                    }

                    // empty
                    if (url === '') {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                        return;
                    }

                    // update
                    editor.chain().focus().extendMarkRange('link').setLink({href: url}).run();
                }}
                isActive={editor.isActive('link')}
                icon={LinkIcon}
                title="Link"
            />
        </BubbleMenu>
    );
};
