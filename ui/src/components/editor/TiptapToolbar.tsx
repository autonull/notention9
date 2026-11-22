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
    LightBulbIcon,
    ListOlIcon,
    ListUlIcon,
    QuoteIcon,
    SparklesIcon,
    StrikethroughIcon,
    ChevronDownIcon,
    EllipsisVerticalIcon
} from '../ui/icons';

interface TiptapToolbarProps {
    editor: Editor | null;
    viewMode: 'rich' | 'code';
    toggleViewMode: () => void;
    onMagic?: () => void;
    onTemplates?: () => void;
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
    type?: 'action';
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
            title: 'Bullet list',
            icon: ListUlIcon,
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: () => editor.isActive('bulletList'),
        },
        {
            title: 'Numbered list',
            icon: ListOlIcon,
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: () => editor.isActive('orderedList'),
        },
        {
            title: 'Quote',
            icon: QuoteIcon,
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: () => editor.isActive('blockquote'),
        },
        {
            title: 'Code block',
            icon: CodeBlockIcon,
            action: () => editor.chain().focus().toggleCodeBlock().run(),
            isActive: () => editor.isActive('codeBlock'),
        },
        {
            title: 'Divider',
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

    const overflowItems: DropdownMenuItem[] = [
        {
            label: 'Strikethrough',
            icon: StrikethroughIcon,
            onClick: () => editor.chain().focus().toggleStrike().run(),
        },
        {
            label: 'Bullet list',
            icon: ListUlIcon,
            onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            label: 'Numbered list',
            icon: ListOlIcon,
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            label: 'Quote',
            icon: QuoteIcon,
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
            label: 'Code block',
            icon: CodeBlockIcon,
            onClick: () => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
            label: 'Divider',
            icon: HorizontalRuleIcon,
            onClick: () => editor.chain().focus().setHorizontalRule().run(),
        },
        ...(onMagic ? [{label: 'Magic align', icon: SparklesIcon, onClick: onMagic}] : []),
        ...(onTemplates ? [{label: 'Insert template', icon: CubeIcon, onClick: onTemplates}] : []),
    ];

    const iconClass = 'h-3.5 w-3.5';

    return (
        <div
            className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--app-line)] bg-[var(--app-bg)] px-2 md:px-4"
            onMouseDown={(event) => event.preventDefault()}
            role="toolbar"
            aria-label="Editor formatting"
        >
            <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Semantic actions">
                {onDescribe && (
                    <button
                        type="button"
                        onClick={onDescribe}
                        title="Describe it — suggest details from your words"
                        aria-label="Describe it"
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                    >
                        <LightBulbIcon className={iconClass}/>
                    </button>
                )}
                {onMagic && (
                    <button
                        type="button"
                        onClick={onMagic}
                        title="Magic align — generate semantic details"
                        aria-label="Magic align"
                        className="hidden h-7 w-7 place-items-center rounded-md text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] sm:grid"
                    >
                        <SparklesIcon className={iconClass}/>
                    </button>
                )}
                {onTemplates && (
                    <button
                        type="button"
                        onClick={onTemplates}
                        title="Insert template"
                        aria-label="Insert template"
                        className="hidden h-7 w-7 place-items-center rounded-md text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)] sm:grid"
                    >
                        <CubeIcon className={iconClass}/>
                    </button>
                )}
            </div>

            <div className="mx-1 h-4 w-px shrink-0 bg-[var(--app-line)]"/>

            <DropdownMenu
                trigger={
                    <button
                        className="flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                        aria-label="Text formatting"
                    >
                        <span>Text</span>
                        <ChevronDownIcon className="h-3 w-3"/>
                    </button>
                }
                items={headingItems}
                align="left"
            />

            <div className="mx-1 h-4 w-px shrink-0 bg-[var(--app-line)]"/>

            <div className="flex shrink-0 items-center gap-0.5">
                {actions.map((item, index) => (
                    item.type === 'separator' ? (
                        <div key={`sep-${index}`} className="mx-1 hidden h-4 w-px bg-[var(--app-line)] sm:block"/>
                    ) : (
                        <div
                            key={item.title}
                            className={item.title === 'Bold' || item.title === 'Italic' ? 'shrink-0' : 'hidden shrink-0 sm:block'}
                        >
                            <IconButton
                                onClick={item.action}
                                disabled={item.disabled?.()}
                                isActive={item.isActive?.()}
                                tooltip={item.title}
                                icon={item.icon}
                                size="md"
                                touchTarget={false}
                                variant="ghost"
                                className="h-7 w-7 p-0 text-[var(--app-text-secondary)]"
                            />
                        </div>
                    )
                ))}

                <div className="shrink-0 sm:hidden">
                    <DropdownMenu
                        trigger={
                            <IconButton
                                icon={EllipsisVerticalIcon}
                                variant="ghost"
                                size="sm"
                                touchTarget={false}
                                tooltip="More formatting"
                                aria-label="More formatting"
                            />
                        }
                        items={overflowItems}
                        align="left"
                    />
                </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center pl-1">
                <IconButton
                    onClick={toggleViewMode}
                    isActive={viewMode === 'code'}
                    tooltip={viewMode === 'code' ? 'Rich text' : 'HTML source'}
                    tooltipPosition="left"
                    icon={CodeBracketsIcon}
                    size="md"
                    touchTarget={false}
                    className="h-7 w-7 p-0 text-[var(--app-text-secondary)]"
                />
            </div>
        </div>
    );
}
