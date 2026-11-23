import React from 'react';
import type {Editor} from '@tiptap/react';

import {CheckCircleIcon, CodeBracketsIcon, ExclamationTriangleIcon, LoadingSpinner} from '../ui/icons';

interface EditorStatusBarProps {
    editor: Editor | null;
    saveStatus?: 'saved' | 'saving' | 'error';
    viewMode?: 'rich' | 'code';
    onToggleViewMode?: () => void;
}

export function EditorStatusBar({editor, saveStatus, viewMode = 'rich', onToggleViewMode}: EditorStatusBarProps) {
    if (!editor) return null;

    const text = editor.getText();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

    return (
        <div className="flex w-full items-center gap-3 text-[11px] tabular-nums text-[var(--app-faint)]">
            {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-[var(--app-muted)]">
                    <LoadingSpinner className="h-3 w-3"/>
                    Saving
                </span>
            )}
            {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-[var(--app-muted)]">
                    <CheckCircleIcon className="h-3 w-3 text-[var(--color-success)]"/>
                    Saved
                </span>
            )}
            {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-[var(--color-error)]">
                    <ExclamationTriangleIcon className="h-3 w-3"/>
                    Not saved
                </span>
            )}
            <span className="hidden sm:inline">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            {onToggleViewMode && (
                <button
                    type="button"
                    onClick={onToggleViewMode}
                    aria-pressed={viewMode === 'code'}
                    title={viewMode === 'code' ? 'Back to the page' : 'View HTML source'}
                    className={`ml-auto inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-medium transition-colors hover:bg-[var(--app-hover)] ${viewMode === 'code' ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-faint)] hover:text-[var(--app-text-secondary)]'}`}
                >
                    <CodeBracketsIcon className="h-3 w-3"/>
                    {viewMode === 'code' ? 'Page' : 'HTML'}
                </button>
            )}
        </div>
    );
}
