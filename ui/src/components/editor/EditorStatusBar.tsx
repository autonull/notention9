import React from 'react';
import type {Editor} from '@tiptap/react';

import {CheckCircleIcon, ExclamationTriangleIcon, LoadingSpinner} from '../common/icons';

interface EditorStatusBarProps {
    editor: Editor | null;
    saveStatus?: 'saved' | 'saving' | 'error';
}

export function EditorStatusBar({editor, saveStatus}: EditorStatusBarProps) {
    if (!editor) return null;

    const text = editor.getText();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    const charCount = text.length;

    return (
        <div
            className="flex-shrink-0 px-4 py-1 bg-gray-900 border-t border-gray-700/50 text-xs text-gray-500 flex items-center justify-between font-mono animate-fade-in">
            <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                    <div className="flex items-center gap-1.5 text-blue-400">
                        <LoadingSpinner className="w-3 h-3"/>
                        <span>Saving...</span>
                    </div>
                )}
                {saveStatus === 'saved' && (
                    <div className="flex items-center gap-1.5 text-green-500/80 transition-opacity duration-1000">
                        <CheckCircleIcon className="w-3.5 h-3.5"/>
                        <span>Saved</span>
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="flex items-center gap-1.5 text-red-400">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5"/>
                        <span>Save Failed</span>
                    </div>
                )}
            </div>
            <div className="flex gap-4">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
            </div>
        </div>
    );
};
