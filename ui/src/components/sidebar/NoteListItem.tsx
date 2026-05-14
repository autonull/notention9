import React, {useRef} from 'react';
import type {Note} from '@notention/core';
import {ClockIcon, DocumentDuplicateIcon, MapPinIcon, PinIcon, TrashIcon, WorldIcon} from '../common/icons';
import {getTextFromHtml} from '../../utils/html';
import {IconButton} from '../common/IconButton';
import {Badge} from '../common/Badge';
import {formatDistanceToNow} from 'date-fns';

export const NoteListItem = React.memo(({
    note,
    isSelected,
    onSelect,
    onDelete,
    onPin,
    isTrash = false,
    onRestore
}: {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onPin?: () => void;
    isTrash?: boolean;
    onRestore?: () => void;
}) => {
    const itemRef = useRef<HTMLDivElement>(null);

    const contentPreview = React.useMemo(() => {
        return getTextFromHtml(note.content) || 'No content';
    }, [note.content]);

    const relativeTime = React.useMemo(() => {
        try {
            return formatDistanceToNow(new Date(note.updatedAt), {addSuffix: true});
        } catch {
            return '';
        }
    }, [note.updatedAt]);

    const displayProperties = React.useMemo(() => {
        return note.properties.slice(0, 2);
    }, [note.properties]);

    const hiddenPropertyCount = Math.max(0, note.properties.length - 2);

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
            className={`note-list-item group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200
        ${isSelected
                ? 'bg-blue-900/20 shadow-sm'
                : 'bg-transparent hover:bg-gray-800/60'
            } focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 overflow-hidden`}
        >
            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-r-full"></div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-1 gap-2 relative z-10 pl-1">
                <h3 className={`font-semibold text-sm leading-tight truncate flex-1 transition-colors ${isSelected ? 'text-blue-50' : 'text-gray-300 group-hover:text-white'}`}>
                    {note.title || 'Untitled Note'}
                </h3>
                {note.pinned && (
                    <PinIcon className="h-2.5 w-2.5 text-blue-400 flex-shrink-0"/>
                )}
            </div>

            {/* Preview */}
            <p className={`text-[11px] pl-1 mb-2 line-clamp-1 leading-relaxed transition-colors ${isSelected ? 'text-blue-200/60' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {contentPreview}
            </p>

            {/* Properties & Meta */}
            <div className="flex items-center justify-between pl-1 relative z-10">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className={`text-[10px] whitespace-nowrap transition-colors ${isSelected ? 'text-blue-300/40' : 'text-gray-600 group-hover:text-gray-500'}`}>
                        {relativeTime}
                    </span>
                    {displayProperties.length > 0 && (
                        <div className="flex gap-1">
                            {displayProperties.map((p, i) => (
                                <span
                                    key={i}
                                    className={`text-[9px] uppercase tracking-wider font-bold transition-colors ${
                                        isSelected ? 'text-blue-400/60' : 'text-gray-700 group-hover:text-gray-600'
                                    }`}
                                >
                                    #{p.key}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hover Actions */}
                <div className={`flex items-center gap-0.5 transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isTrash && onRestore && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            tabIndex={-1}
                            className="text-gray-500 hover:text-green-400 p-0.5"
                            icon={() => <DocumentDuplicateIcon className="h-3 w-3 transform rotate-180"/>}
                            size="sm"
                            variant="ghost"
                        />
                    )}
                    {onPin && !isTrash && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onPin(); }}
                            tabIndex={-1}
                            className={`${note.pinned ? 'text-blue-400' : 'text-gray-500 hover:text-white'} p-0.5`}
                            icon={PinIcon}
                            size="sm"
                            variant="ghost"
                        />
                    )}
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        tabIndex={-1}
                        className="text-gray-500 hover:text-red-400 p-0.5"
                        icon={TrashIcon}
                        size="sm"
                        variant="ghost"
                    />
                </div>
            </div>
        </div>
    );
});

NoteListItem.displayName = 'NoteListItem';
