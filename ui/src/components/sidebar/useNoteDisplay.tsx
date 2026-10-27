import { useMemo } from 'react';
import type { Note } from '@notention/core';
import { getTextFromHtml } from '../../utils/html';
import { formatDistanceToNow } from 'date-fns';

export interface NoteDisplayState {
    contentPreview: string;
    relativeTime: string;
    displayProperties: Array<{ key: string }>;
    isPublic: boolean;
    isImported: boolean;
    isPinned: boolean;
    isTrash: boolean;
    priority: number;
    isLowPriority: boolean;
    isVeryLowPriority: boolean;
}

/**
 * Extracts common display state from a note for use in list/grid items.
 * Consolidates duplicated logic between NoteListItem and NoteGridItem.
 */
export function useNoteDisplay(note: Note): NoteDisplayState {
    const contentPreview = useMemo(() => {
        return getTextFromHtml(note.content) || 'No content';
    }, [note.content]);

    const relativeTime = useMemo(() => {
        try {
            return formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });
        } catch {
            return '';
        }
    }, [note.updatedAt]);

    const displayProperties = useMemo(() => {
        return note.properties.slice(0, 2);
    }, [note.properties]);

    const isPublic = note.privacy === 'public';
    const isImported = note.source?.type === 'import' || note.source?.type === 'skill';
    const isPinned = note.pinned ?? false;
    const priority = note.priority ?? 1.0;
    const isLowPriority = priority < 0.5;
    const isVeryLowPriority = priority < 0.3;

    return {
        contentPreview,
        relativeTime,
        displayProperties,
        isPublic,
        isImported,
        isPinned,
        isTrash: false, // Set by consumer if needed
        priority,
        isLowPriority,
        isVeryLowPriority
    };
}

/**
 * Generates highlighted text for search term matching.
 */
export function useHighlightedText(text: string, searchTerm: string): React.ReactNode | string {
    return useMemo(() => {
        if (!searchTerm) return text;
        const term = searchTerm.toLowerCase();
        const idx = text.toLowerCase().indexOf(term);
        if (idx === -1) return text;
        return (
            <span>
                {text.slice(0, idx)}
                <mark className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">
                    {text.slice(idx, idx + term.length)}
                </mark>
                {text.slice(idx + term.length)}
            </span>
        );
    }, [text, searchTerm]);
}

/**
 * Generates highlighted preview with context around the match.
 */
export function useHighlightedPreview(preview: string, searchTerm: string): React.ReactNode | string {
    return useMemo(() => {
        if (!searchTerm) return preview;
        const term = searchTerm.toLowerCase();
        const idx = preview.toLowerCase().indexOf(term);
        if (idx === -1) return preview;
        const start = Math.max(0, idx - 20);
        const end = Math.min(preview.length, idx + term.length + 20);
        return (
            <span>
                {start > 0 && '...'}
                {preview.slice(start, idx)}
                <mark className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">
                    {preview.slice(idx, idx + term.length)}
                </mark>
                {preview.slice(idx + term.length, end)}
                {end < preview.length && '...'}
            </span>
        );
    }, [preview, searchTerm]);
}

/**
 * Returns the CSS classes for a note item based on its state and selection.
 */
export function getNoteItemClasses(
    isSelected: boolean,
    displayState: NoteDisplayState,
    isMobile: boolean,
    variant: 'list' | 'grid' = 'list'
): string {
    if (variant === 'grid') {
        return `
            relative aspect-square flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
            ${isSelected
                ? 'bg-blue-900/30 border-blue-500/50 text-blue-100 shadow-md shadow-blue-900/20'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }
            ${!isSelected && displayState.isPublic ? 'border-green-800/50' : ''}
            ${!isSelected && !displayState.isPublic && !displayState.isVeryLowPriority ? 'border-gray-700/50' : ''}
            ${!isSelected && displayState.isVeryLowPriority ? 'border-gray-700/50 border-dashed' : ''}
            ${displayState.isLowPriority ? 'opacity-50' : ''}
        `.trim();
    }

    // List variant
    return `
        note-list-item group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden pressable
        ${isSelected
            ? 'bg-blue-900/20 shadow-sm ring-1 ring-blue-500/30'
            : 'bg-transparent hover:bg-gray-800/60 active:bg-gray-700/50'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    `.trim();
}

/**
 * Returns the CSS classes for property badges based on selection state.
 */
export function getPropertyBadgeClasses(isSelected: boolean): string {
    return `
        text-[9px] uppercase tracking-wider font-bold transition-colors px-1.5 py-0.5 rounded border
        ${isSelected
            ? 'text-blue-400/60 border-blue-800/50 bg-blue-900/20'
            : 'text-gray-700 group-hover:text-gray-600 border-gray-700 bg-gray-800/50'
        }
    `.trim();
}

/**
 * Returns the CSS classes for the relative time text based on selection state.
 */
export function getRelativeTimeClasses(isSelected: boolean): string {
    return `
        text-[10px] whitespace-nowrap transition-colors
        ${isSelected ? 'text-blue-300/40' : 'text-gray-600 group-hover:text-gray-500'}
    `.trim();
}