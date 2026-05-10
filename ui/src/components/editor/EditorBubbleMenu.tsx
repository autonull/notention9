import React from 'react';
import {Editor} from '@tiptap/react';
import {BubbleMenu} from '@tiptap/react/menus';
import {BoldIcon, CodeBracketsIcon, ItalicIcon, LinkIcon, QuoteIcon, StrikethroughIcon} from '../common/icons';

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
        className={`p-1.5 transition-all first:rounded-l-md last:rounded-r-md ${
            isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-900 text-gray-500 hover:text-gray-200 hover:bg-gray-800'
        }`}
        title={title}
        type="button"
    >
        <Icon className="h-3.5 w-3.5"/>
    </button>
);

export function EditorBubbleMenu({editor}: EditorBubbleMenuProps) {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{duration: 100}}
            className="flex items-center rounded-md shadow-2xl border border-gray-800 overflow-hidden bg-gray-900 ring-1 ring-white/5"
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
            <div className="w-px h-8 bg-gray-700"/>
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
