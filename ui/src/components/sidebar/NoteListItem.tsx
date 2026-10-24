import React, {useRef, useMemo} from 'react';
import type {Note} from '@notention/core';
import {ClockIcon, DocumentDuplicateIcon, MapPinIcon, PinIcon, TrashIcon, WorldIcon} from '../common/icons';
import {getTextFromHtml} from '../../utils/html';
import {IconButton} from '../ui/Primitives';
import {Badge} from '../common/Badge';
import {formatDistanceToNow} from 'date-fns';
import {cn} from '../../utils/ui';

interface NoteListItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onPin?: () => void;
    isTrash?: boolean;
    onRestore?: () => void;
    searchTerm?: string;
}

export const NoteListItem = React.memo(({
    note,
    isSelected,
    onSelect,
    onDelete,
    onPin,
    isTrash = false,
    onRestore,
    searchTerm = ''
}: NoteListItemProps) => {
    const itemRef = useRef<HTMLDivElement>(null);

    const contentPreview = useMemo(() => {
        return getTextFromHtml(note.content) || 'No content';
    }, [note.content]);

    const relativeTime = useMemo(() => {
        try {
            return formatDistanceToNow(new Date(note.updatedAt), {addSuffix: true});
        } catch {
            return '';
        }
    }, [note.updatedAt]);

    const displayProperties = useMemo(() => {
        return note.properties.slice(0, 2);
    }, [note.properties]);

    const highlightedTitle = useMemo(() => {
        if (!searchTerm) return note.title || 'Untitled Note';
        const term = searchTerm.toLowerCase();
        const title = note.title || 'Untitled Note';
        const idx = title.toLowerCase().indexOf(term);
        if (idx === -1) return title;
        return (
            <span>
                {title.slice(0, idx)}
                <mark className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{title.slice(idx, idx + term.length)}</mark>
                {title.slice(idx + term.length)}
            </span>
        );
    }, [note.title, searchTerm]);

    const highlightedPreview = useMemo(() => {
        if (!searchTerm) return contentPreview;
        const term = searchTerm.toLowerCase();
        const idx = contentPreview.toLowerCase().indexOf(term);
        if (idx === -1) return contentPreview;
        const start = Math.max(0, idx - 20);
        const end = Math.min(contentPreview.length, idx + term.length + 20);
        return (
            <span>
                {start > 0 && '...'}
                {contentPreview.slice(start, idx)}
                <mark className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{contentPreview.slice(idx, idx + term.length)}</mark>
                {contentPreview.slice(idx + term.length, end)}
                {end < contentPreview.length && '...'}
            </span>
        );
    }, [contentPreview, searchTerm]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = itemRef.current?.nextElementSibling as HTMLElement;
            if (next && next.classList.contains('note-list-item')) {
                next.focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = itemRef.current?.previousElementSibling as HTMLElement;
            if (prev && prev.classList.contains('note-list-item')) {
                prev.focus();
            } else {
                const searchInput = document.getElementById('sidebar-search-input');
                if (searchInput) searchInput.focus();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onSelect();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDelete();
        } else if (e.key.toLowerCase() === 'p' && onPin) {
            e.preventDefault();
            onPin();
        }
    };

    return (
        <div
            ref={itemRef}
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className={cn(
                'note-list-item group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden pressable',
                isSelected
                    ? 'bg-blue-900/20 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-transparent hover:bg-gray-800/60 active:bg-gray-700/50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900'
            )}
        >
            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-r-full"></div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-1 gap-2 relative z-10 pl-1">
                <h3 className={cn('font-semibold text-sm leading-tight truncate flex-1 transition-colors', isSelected ? 'text-blue-50' : 'text-gray-300 group-hover:text-white')}>
                    {highlightedTitle}
                </h3>
                {note.pinned && (
                    <PinIcon className="h-2.5 w-2.5 text-blue-400 flex-shrink-0 animate-pulse-subtle"/>
                )}
            </div>

            {/* Preview */}
            <p className={cn('text-[11px] pl-1 mb-2 line-clamp-1 leading-relaxed transition-colors', isSelected ? 'text-blue-200/60' : 'text-gray-500 group-hover:text-gray-400')}>
                {highlightedPreview}
            </p>

            {/* Properties & Meta */}
            <div className="flex items-center justify-between pl-1 relative z-10">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className={cn('text-[10px] whitespace-nowrap transition-colors', isSelected ? 'text-blue-300/40' : 'text-gray-600 group-hover:text-gray-500')}>
                        {relativeTime}
                    </span>
                    {displayProperties.length > 0 && (
                        <div className="flex gap-1">
                            {displayProperties.map((p, i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        'text-[9px] uppercase tracking-wider font-bold transition-colors px-1.5 py-0.5 rounded border',
                                        isSelected
                                            ? 'text-blue-400/60 border-blue-800/50 bg-blue-900/20'
                                            : 'text-gray-700 group-hover:text-gray-600 border-gray-700 bg-gray-800/50'
                                    )}
                                >
                                    #{p.key}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hover Actions */}
                <div className={cn(
                    'flex items-center gap-0.5 transition-all duration-200',
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}>
                    {isTrash && onRestore && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            tabIndex={-1}
                            className="text-gray-500 hover:text-green-400 p-0.5"
                            icon={() => <DocumentDuplicateIcon className="h-3 w-3 transform rotate-180"/>}
                            size="sm"
                            variant="ghost"
                            aria-label="Restore note"
                        />
                    )}
                    {onPin && !isTrash && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onPin(); }}
                            tabIndex={-1}
                            className={cn(note.pinned ? 'text-blue-400' : 'text-gray-500 hover:text-white p-0.5', note.pinned && 'animate-pulse-subtle')}
                            icon={PinIcon}
                            size="sm"
                            variant="ghost"
                            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                        />
                    )}
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        tabIndex={-1}
                        className="text-gray-500 hover:text-red-400 p-0.5"
                        icon={TrashIcon}
                        size="sm"
                        variant="ghost"
                        aria-label={isTrash ? 'Delete permanently' : 'Move to trash'}
                    />
                </div>
            </div>
        </div>
    );
});

NoteListItem.displayName = 'NoteListItem';