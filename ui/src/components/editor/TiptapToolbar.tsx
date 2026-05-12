import React from 'react';
import type {Editor} from '@tiptap/react';
import {IconButton} from '../common/IconButton';
import {DropdownMenu, DropdownMenuItem} from '../common/DropdownMenu';
import {
    BoldIcon,
    CodeBlockIcon,
    CodeBracketsIcon,
    CubeIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    HorizontalRuleIcon,
    ItalicIcon,
    KeyIcon,
    ListOlIcon,
    ListUlIcon,
    QuoteIcon,
    SparklesIcon,
    StrikethroughIcon,
    ChevronDownIcon
} from '../common/icons';

interface TiptapToolbarProps {
    editor: Editor | null;
    viewMode: 'rich' | 'code';
    toggleViewMode: () => void;
    onMagic?: () => void;
    onTemplates?: () => void;
    onInsertProperty?: () => void;
}

type ToolbarItem =
    | { type: 'separator' }
    | {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    isActive?: () => boolean;
    disabled?: () => boolean;
    type?: undefined;
};

export function TiptapToolbar({
                                  editor,
                                  viewMode,
                                  toggleViewMode,
                                  onMagic,
                                  onTemplates,
                                  onInsertProperty,
                              }: TiptapToolbarProps) {
    if (!editor) return null;

    const actions: ToolbarItem[] = [
        {
            title: 'Bold',
            icon: BoldIcon,
            action: () => editor.chain().focus().toggleBold().run(),
            isActive: () => editor.isActive('bold'),
            disabled: () => !editor.can().chain().focus().toggleBold().run(),
        },
        {
            title: 'Italic',
            icon: ItalicIcon,
            action: () => editor.chain().focus().toggleItalic().run(),
            isActive: () => editor.isActive('italic'),
            disabled: () => !editor.can().chain().focus().toggleItalic().run(),
        },
        {
            title: 'Strikethrough',
            icon: StrikethroughIcon,
            action: () => editor.chain().focus().toggleStrike().run(),
            isActive: () => editor.isActive('strike'),
            disabled: () => !editor.can().chain().focus().toggleStrike().run(),
        },
        {type: 'separator'},
        {
            title: 'Bullet List',
            icon: ListUlIcon,
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: () => editor.isActive('bulletList'),
        },
        {
            title: 'Numbered List',
            icon: ListOlIcon,
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: () => editor.isActive('orderedList'),
        },
        {
            title: 'Blockquote',
            icon: QuoteIcon,
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: () => editor.isActive('blockquote'),
        },
        {
            title: 'Code Block',
            icon: CodeBlockIcon,
            action: () => editor.chain().focus().toggleCodeBlock().run(),
            isActive: () => editor.isActive('codeBlock'),
        },
        {
            title: 'Horizontal Rule',
            icon: HorizontalRuleIcon,
            action: () => editor.chain().focus().setHorizontalRule().run(),
        },
    ];

    const headingItems: DropdownMenuItem[] = [
        {
            label: 'Heading 1',
            icon: Heading1Icon,
            onClick: () => editor.chain().focus().toggleHeading({level: 1}).run(),
        },
        {
            label: 'Heading 2',
            icon: Heading2Icon,
            onClick: () => editor.chain().focus().toggleHeading({level: 2}).run(),
        },
        {
            label: 'Heading 3',
            icon: Heading3Icon,
            onClick: () => editor.chain().focus().toggleHeading({level: 3}).run(),
        },
    ];

    return (
        <div
            className="flex-shrink-0 px-3 py-1.5 border-b border-gray-700/50 flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm overflow-x-auto flex-nowrap md:flex-wrap">
            {(onMagic || onTemplates || onInsertProperty) && (
                <div
                    className="flex items-center gap-1 bg-purple-900/20 p-0.5 rounded-lg border border-purple-500/20 mr-2 flex-shrink-0">
                    {onMagic && (
                        <IconButton
                            onClick={onMagic}
                            tooltip="Magic Align (Auto-generate semantic properties)"
                            icon={SparklesIcon}
                            isActive={false}
                            className="text-purple-300 hover:text-white"
                        />
                    )}
                    {onTemplates && (
                        <IconButton
                            onClick={onTemplates}
                            tooltip="Insert Template"
                            icon={CubeIcon}
                            isActive={false}
                            className="text-purple-300 hover:text-white"
                        />
                    )}
                    {onInsertProperty && (
                        <IconButton
                            onClick={onInsertProperty}
                            tooltip="Insert Property"
                            icon={KeyIcon}
                            isActive={false}
                            className="text-purple-300 hover:text-white"
                        />
                    )}
                </div>
            )}

            <div className="flex items-center gap-0.5 flex-grow flex-nowrap md:flex-wrap">
                {/* Heading Dropdown */}
                <DropdownMenu
                    trigger={
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                            <span className="text-[10px] uppercase tracking-wider font-bold">Text</span>
                            <ChevronDownIcon className="w-3 h-3"/>
                        </button>
                    }
                    items={headingItems}
                    align="left"
                />

                <div className="w-px h-4 bg-gray-700/50 mx-1.5 flex-shrink-0"></div>

                {actions.map((item, index) => (
                    item.type === 'separator' ? (
                        <div key={`sep-${index}`} className="w-px h-4 bg-gray-700/50 mx-1.5 hidden sm:block flex-shrink-0"></div>
                    ) : (
                        <div key={item.title} className="flex-shrink-0">
                            <IconButton
                                onClick={item.action}
                                disabled={item.disabled?.()}
                                isActive={item.isActive?.()}
                                tooltip={item.title}
                                icon={item.icon}
                            />
                        </div>
                    )
                ))}
            </div>

            <div className="border-l border-gray-700/50 pl-2 ml-1 flex-shrink-0">
                <IconButton
                    onClick={toggleViewMode}
                    isActive={viewMode === 'code'}
                    tooltip={
                        viewMode === 'code' ? 'Switch to Rich Text' : 'Switch to HTML Code'
                    }
                    tooltipPosition="left"
                    icon={CodeBracketsIcon}
                />
            </div>
        </div>
    );
};
