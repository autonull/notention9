import { useMemo } from 'react';
import type { Note } from '@notention/core';
import { getTextFromHtml } from '../../utils/html';
import { formatDistanceToNowStrict } from 'date-fns';

const formatCompactRelativeTime = (date: Date): string =>
    formatDistanceToNowStrict(date, { addSuffix: true })
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y')
        .replace(' seconds', 's')
        .replace(' second', 's');

export interface NoteDisplayState {
    contentPreview: string;
    relativeTime: string;
    displayProperties: Array<{ key: string; operator: string; values: string[] }>;
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
            return formatCompactRelativeTime(new Date(note.updatedAt));
        } catch {
            return '';
        }
    }, [note.updatedAt]);

    const displayProperties = useMemo(() => {
        const preference = ['intent', 'type', 'status'];
        const preferred = preference
            .map(key => note.properties.find(property => property.key === key))
            .find(Boolean);
        return preferred ? [preferred] : note.properties.slice(0, 1);
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
 * Human-readable label for a property chip in a list row.
 * `intent = request` reads as `request`; `rate = 25` reads as `rate 25`.
 */
export function formatPropertyChip(property: {key: string; values: string[]}): string {
    const primaryValue = (property.values[0] ?? '').trim();
    const value = primaryValue.includes('/')
        ? primaryValue.split('/').pop()!.replace(/[-_]/g, ' ')
        : primaryValue;
    const compactKeys = new Set(['intent', 'type', 'status']);
    if (!value) return property.key;
    return compactKeys.has(property.key) ? value : `${property.key} ${value}`;
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
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            }
            ${!isSelected && displayState.isPublic ? 'border-green-800/50' : ''}
            ${!isSelected && !displayState.isPublic && !displayState.isVeryLowPriority ? 'border-neutral-700/50' : ''}
            ${!isSelected && displayState.isVeryLowPriority ? 'border-neutral-700/50 border-dashed' : ''}
            ${displayState.isLowPriority ? 'opacity-50' : ''}
        `.trim();
    }

    // List variant
    return `
        note-list-item group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden pressable
        ${isSelected
            ? 'bg-blue-900/20 shadow-sm ring-1 ring-blue-500/30'
            : 'bg-transparent hover:bg-neutral-800/60 active:bg-neutral-700/50'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900
    `.trim();
}

/**
 * Returns the CSS classes for property badges based on selection state.
 */
export function getPropertyBadgeClasses(isSelected: boolean): string {
    return `
        inline-block max-w-[150px] truncate align-bottom text-xs tracking-normal font-medium whitespace-nowrap transition-colors px-1.5 py-0.5 rounded border
        ${isSelected
            ? 'text-blue-200/70 border-blue-800/50 bg-blue-900/20'
            : 'text-neutral-400 border-neutral-700/60 bg-neutral-800/40 group-hover:text-neutral-300'
        }
    `.trim();
}

/**
 * Returns the CSS classes for the relative time text based on selection state.
 */
export function getRelativeTimeClasses(isSelected: boolean): string {
    return `
        text-[11px] whitespace-nowrap transition-colors
        ${isSelected ? 'text-blue-300/60' : 'text-neutral-400 group-hover:text-neutral-400'}
    `.trim();
}