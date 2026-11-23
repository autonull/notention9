import { useMemo } from 'react';
import type { Note } from '@notention/core';
import { getTextFromHtml } from '../../utils/html';
import { formatDistanceToNowStrict } from 'date-fns';
import { formatPropertyValue } from '../../utils/propertyDisplay';

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

const formatRecentTime = (date: Date): string => {
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    return seconds < 45 ? 'now' : formatCompactRelativeTime(date);
};

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
            return formatRecentTime(new Date(note.updatedAt));
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
    const value = formatPropertyValue(primaryValue);
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
    variant: "list" | "grid" = "list"
): string {
    if (variant === "grid") {
        return `
            relative flex min-h-[116px] cursor-pointer flex-col rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-3.5 transition-colors
            hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40
            ${isSelected ? "border-[var(--app-accent-line)] bg-[var(--app-panel)]" : ""}
            ${!isSelected && displayState.isVeryLowPriority ? "border-dashed" : ""}
            ${displayState.isLowPriority ? "opacity-65" : ""}
        `.trim();
    }

    return `
        group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors
        ${isSelected
            ? "border-[var(--app-line)] bg-[var(--app-raised)] before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--app-accent)]"
            : "border-transparent hover:bg-[var(--app-hover)]"
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40
        ${displayState.isLowPriority ? "opacity-70" : ""}
    `.trim();
}

export function getPropertyBadgeClasses(isSelected: boolean): string {
    return `
        inline-block max-w-[150px] truncate whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors
        ${isSelected
            ? "border-[var(--app-line-strong)] bg-[var(--app-raised)] text-[var(--app-text-secondary)]"
            : "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-muted)] group-hover:text-[var(--app-text-secondary)]"
        }
    `.trim();
}

export function getRelativeTimeClasses(isSelected: boolean): string {
    return `
        text-[11px] tabular-nums whitespace-nowrap transition-colors
        ${isSelected ? "text-[var(--app-muted)]" : "text-[var(--app-faint)] group-hover:text-[var(--app-muted)]"}
    `.trim();
}

/** One tab stop per list: the selected row, or the first row when it is elsewhere. */
export function noteRowTabIndex(notes: Note[], selectedNoteId: string | null, noteId: string): 0 | -1 {
    return noteId === selectedNoteId ||
        (!notes.some(note => note.id === selectedNoteId) && notes[0]?.id === noteId)
        ? 0
        : -1;
}
