import React from 'react';
import type {Editor} from '@tiptap/react';

import {CheckCircleIcon, ExclamationTriangleIcon, LoadingSpinner} from '../ui/icons';

interface EditorStatusBarProps {
    editor: Editor | null;
    saveStatus?: 'saved' | 'saving' | 'error';
}

export function EditorStatusBar({editor, saveStatus}: EditorStatusBarProps) {
    if (!editor) return null;

    const text = editor.getText();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

    return (
        <div className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-[var(--app-faint)]">
            {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-[var(--app-muted)]">
                    <LoadingSpinner className="h-3 w-3"/>
                    Saving
                </span>
            )}
            {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-[var(--app-muted)]">
                    <CheckCircleIcon className="h-3 w-3 text-emerald-400/80"/>
                    Saved
                </span>
            )}
            {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-red-400">
                    <ExclamationTriangleIcon className="h-3 w-3"/>
                    Not saved
                </span>
            )}
            <span className="hidden sm:inline">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
    );
}
