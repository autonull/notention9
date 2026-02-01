import React from 'react';
import type { Editor } from '@tiptap/react';
import { IconButton } from '../common/IconButton';
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListUlIcon,
  ListOlIcon,
  QuoteIcon,
  CodeBlockIcon,
  CodeBracketsIcon,
  HorizontalRuleIcon,
  SparklesIcon,
  CubeIcon,
  KeyIcon,
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
    { type: 'separator' },
    {
      title: 'Heading 1',
      icon: Heading1Icon,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      title: 'Heading 2',
      icon: Heading2Icon,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      title: 'Heading 3',
      icon: Heading3Icon,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    { type: 'separator' },
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

  return (
    <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700/50 flex items-center flex-wrap gap-2 bg-gray-900/50 backdrop-blur-sm">
      {(onMagic || onTemplates || onInsertProperty) && (
        <div className="flex items-center gap-1 bg-purple-900/20 p-0.5 rounded-lg border border-purple-500/20 mr-2">
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

      <div className="flex items-center flex-wrap gap-0.5 flex-grow">
        {actions.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div
                key={`sep-${index}`}
                className="w-px h-4 bg-gray-700/50 mx-1.5 hidden sm:block"
              ></div>
            );
          }
          return (
            <IconButton
              key={item.title}
              onClick={item.action}
              disabled={item.disabled ? item.disabled() : false}
              isActive={item.isActive ? item.isActive() : false}
              tooltip={item.title}
              icon={item.icon}
            />
          );
        })}
      </div>

      <div className="border-l border-gray-700/50 pl-2 ml-1">
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
