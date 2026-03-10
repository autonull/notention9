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
            className={`note-list-item group relative flex flex-col p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200 border
        ${isSelected
                ? 'bg-blue-900/20 border-blue-500/40 shadow-sm'
                : 'bg-transparent border-transparent hover:bg-gray-800/60 hover:border-gray-700/50'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className={`font-semibold text-sm truncate flex-1 ${isSelected ? 'text-blue-100' : 'text-gray-200 group-hover:text-white'}`}>
                    {note.title || 'Untitled Note'}
                </h3>
                {note.pinned && (
                    <PinIcon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0"/>
                )}
            </div>

            {/* Preview */}
            <p className={`text-xs truncate mb-2.5 h-4 ${isSelected ? 'text-blue-200/60' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {contentPreview}
            </p>

            {/* Properties & Meta */}
            <div className="flex items-end justify-between">
                <div className="flex flex-wrap gap-1.5 max-w-[70%]">
                    {displayProperties.map((p, i) => (
                        <Badge
                            key={i}
                            size="sm"
                            variant="outline"
                            className={`max-w-[100px] truncate ${isSelected ? 'border-blue-400/30 text-blue-200' : 'border-gray-700 text-gray-400'}`}
                        >
                            {p.key}
                        </Badge>
                    ))}
                    {hiddenPropertyCount > 0 && (
                        <span className={`text-[10px] self-center px-1 ${isSelected ? 'text-blue-300' : 'text-gray-600'}`}>
                            +{hiddenPropertyCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-[10px] whitespace-nowrap ${isSelected ? 'text-blue-300/60' : 'text-gray-600'}`}>
                        {relativeTime}
                    </span>

                    {/* Hover Actions */}
                    <div className={`flex items-center gap-1 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isTrash && onRestore && (
                            <IconButton
                                onClick={(e) => { e.stopPropagation(); onRestore(); }}
                                tabIndex={-1}
                                className="text-gray-400 hover:text-green-400 p-1"
                                icon={() => <DocumentDuplicateIcon className="h-3.5 w-3.5 transform rotate-180"/>}
                                size="sm"
                                variant="ghost"
                            />
                        )}
                        {onPin && !isTrash && (
                            <IconButton
                                onClick={(e) => { e.stopPropagation(); onPin(); }}
                                tabIndex={-1}
                                className={`${note.pinned ? 'text-blue-400' : 'text-gray-400 hover:text-white'} p-1`}
                                icon={PinIcon}
                                size="sm"
                                variant="ghost"
                            />
                        )}
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            tabIndex={-1}
                            className="text-gray-400 hover:text-red-400 p-1"
                            icon={TrashIcon}
                            size="sm"
                            variant="ghost"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

NoteListItem.displayName = 'NoteListItem';
