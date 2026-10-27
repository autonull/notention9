import React, {useMemo} from 'react';
import type {Editor} from '@tiptap/react';
import {IconButton} from '../ui/Button';
import {DropdownMenu, DropdownMenuItem} from '../ui/Primitives';
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
    LightBulbIcon,
    ListOlIcon,
    ListUlIcon,
    QuoteIcon,
    SparklesIcon,
    StrikethroughIcon,
    ChevronDownIcon
} from '../ui/icons';

interface TiptapToolbarProps {
    editor: Editor | null;
    viewMode: 'rich' | 'code';
    toggleViewMode: () => void;
    onMagic?: () => void;
    onTemplates?: () => void;
    onInsertProperty?: () => void;
    onDescribe?: () => void;
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
    primary?: boolean;
};

export function TiptapToolbar(props: TiptapToolbarProps) {
    return props.editor ? <TiptapToolbarContent {...props} editor={props.editor}/> : null;
}

function TiptapToolbarContent({
                                  editor,
                                  viewMode,
                                  toggleViewMode,
                                  onMagic,
                                  onTemplates,
                                  onInsertProperty,
                                  onDescribe,
                              }: TiptapToolbarProps & { editor: Editor }) {
    const actions = useMemo<ToolbarItem[]>(() => [
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
    ], [editor]);

    const headingItems: DropdownMenuItem[] = useMemo(() => [
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
    ], [editor]);

    const hasSemanticActions = onMagic || onTemplates || onInsertProperty || onDescribe;

    return (
        <div
            className="flex-shrink-0 px-3 py-2 border-b border-gray-700/50 flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm overflow-x-auto flex-wrap"
            role="toolbar"
            aria-label="Editor formatting"
        >
            {hasSemanticActions && (
                <div
                    className="flex items-center gap-1.5 bg-purple-900/20 p-1 rounded-lg border border-purple-500/20 mr-2 flex-shrink-0"
                    role="group"
                    aria-label="Semantic actions"
                >
                    {onInsertProperty && (
                        <button
                            onClick={onInsertProperty}
                            data-testid="add-detail"
                            title="Add detail (Ctrl+Shift+P)"
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/40 hover:text-white transition-colors"
                        >
                            <KeyIcon className="w-4 h-4"/>
                            <span className="hidden sm:inline">Add detail</span>
                        </button>
                    )}
                    {onDescribe && (
                        <IconButton
                            onClick={onDescribe}
                            tooltip="Describe it — suggest details from your words"
                            icon={LightBulbIcon}
                            isActive={false}
                            data-testid="describe-it"
                            className="text-purple-300 hover:text-white"
                            variant="ghost"
                            size="md"
                        />
                    )}
                    {onMagic && (
                        <IconButton
                            onClick={onMagic}
                            tooltip="Magic Align — auto-generate semantic properties"
                            icon={SparklesIcon}
                            isActive={false}
                            className="text-purple-300 hover:text-white"
                            variant="ghost"
                            size="md"
                        />
                    )}
                    {onTemplates && (
                        <IconButton
                            onClick={onTemplates}
                            tooltip="Insert Template"
                            icon={CubeIcon}
                            isActive={false}
                            className="text-purple-300 hover:text-white"
                            variant="ghost"
                            size="md"
                        />
                    )}
                </div>
            )}

            <div className="flex items-center gap-0.5 flex-grow flex-wrap">
                {/* Heading Dropdown */}
                <DropdownMenu
                    trigger={
                        <button
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                            aria-label="Text formatting"
                        >
                            <span className="text-[10px] uppercase tracking-wider font-bold hidden sm:inline">Text</span>
                            <ChevronDownIcon className="w-3 h-3"/>
                        </button>
                    }
                    items={headingItems}
                    align="left"
                />

                <div className="w-px h-5 bg-gray-700/50 mx-1.5 flex-shrink-0 hidden sm:block"></div>

                {actions.map((item, index) => (
                    item.type === 'separator' ? (
                        <div key={`sep-${index}`} className="w-px h-5 bg-gray-700/50 mx-1.5 hidden sm:block flex-shrink-0"></div>
                    ) : (
                        <div key={item.title} className="flex-shrink-0">
                            <IconButton
                                onClick={item.action}
                                disabled={item.disabled?.()}
                                isActive={item.isActive?.()}
                                tooltip={item.title}
                                icon={item.icon}
                                size="md"
                                variant={item.isActive?.() ? 'secondary' : 'ghost'}
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
                    size="md"
                />
            </div>
        </div>
    );
};
