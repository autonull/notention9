import React, {useRef, useMemo, useState, useEffect, useCallback} from 'react';
import type {Note} from '@notention/core';
import {DocumentDuplicateIcon, PinIcon, TrashIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {cn} from '../../utils/ui';
import {useSwipeActions, SwipeActionItem} from '../../hooks/useTouchGestures';
import {useNoteDisplay, useHighlightedText, useHighlightedPreview, getNoteItemClasses, getPropertyBadgeClasses, getRelativeTimeClasses} from './useNoteDisplay';

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
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const {
        contentPreview,
        relativeTime,
        displayProperties,
        isPinned,
        isLowPriority,
        isVeryLowPriority
    } = useNoteDisplay(note);

    const highlightedTitle = useHighlightedText(note.title || 'Untitled Note', searchTerm);
    const highlightedPreview = useHighlightedPreview(contentPreview, searchTerm);

    // Swipe actions for mobile
    const swipeActions: SwipeActionItem[] = isMobile ? [
        ...(!isTrash && onPin ? [{
            id: 'pin',
            label: isPinned ? 'Unpin' : 'Pin',
            icon: <PinIcon className="w-5 h-5"/>,
            onClick: () => onPin!(),
            variant: isPinned ? 'default' : 'primary',
            backgroundColor: isPinned ? '#3b82f6' : '#22c55e',
        }] : []),
        ...(isTrash && onRestore ? [{
            id: 'restore',
            label: 'Restore',
            icon: <DocumentDuplicateIcon className="w-5 h-5 transform rotate-180"/>,
            onClick: () => onRestore!(),
            variant: 'primary',
            backgroundColor: '#16a34a',
        }] : []),
        {
            id: 'delete',
            label: isTrash ? 'Delete' : 'Trash',
            icon: <TrashIcon className="w-5 h-5"/>,
            onClick: () => onDelete(),
            variant: 'destructive',
            backgroundColor: '#dc2626',
        },
    ] : [];

    const {ref: swipeRef, style: swipeStyle, offset, activeSide, handleTouchStart, handleTouchMove, handleTouchEnd} = useSwipeActions({
        leftActions: [],
        rightActions: swipeActions,
        threshold: 80,
    });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
        } else if (e.key.toLowerCase() === 'p' && onPin) {
            e.preventDefault();
            e.stopPropagation();
            onPin();
        }
    };

    const combinedRef = useCallback((el: HTMLDivElement | null) => {
        itemRef.current = el;
        swipeRef.current = el;
    }, [swipeRef]);

    const itemClasses = getNoteItemClasses(isSelected, {
        contentPreview: '',
        relativeTime: '',
        displayProperties: [],
        isPublic: false,
        isImported: false,
        isPinned,
        isTrash,
        priority: 1,
        isLowPriority,
        isVeryLowPriority
    }, isMobile, 'list');

    return (
        <div
            ref={combinedRef}
            style={swipeStyle as React.CSSProperties}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className={itemClasses}
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
                {isPinned && (
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
                    <span className={getRelativeTimeClasses(isSelected)}>
                        {relativeTime}
                    </span>
                    {displayProperties.length > 0 && (
                        <div className="flex gap-1">
                            {displayProperties.map((p, i) => (
                                <span
                                    key={i}
                                    className={getPropertyBadgeClasses(isSelected)}
                                >
                                    #{p.key}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hover Actions - Desktop */}
                {!isMobile && (
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
                                className={cn(isPinned ? 'text-blue-400' : 'text-gray-500 hover:text-white p-0.5', isPinned && 'animate-pulse-subtle')}
                                icon={PinIcon}
                                size="sm"
                                variant="ghost"
                                aria-label={isPinned ? 'Unpin note' : 'Pin note'}
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
                )}

                {/* Swipe Action Indicators - Mobile */}
                {isMobile && activeSide && (
                    <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none" aria-hidden="true">
                        {swipeActions.slice(-3).map((action, idx) => (
                            <div
                                key={action.id}
                                className="flex items-center justify-center w-12 h-12 rounded-lg mr-1 text-white font-medium text-xs transition-opacity"
                                style={{
                                    backgroundColor: action.backgroundColor,
                                    opacity: Math.min(Math.abs(offset) / 180, 1),
                                    transform: `translateX(${offset > 0 ? 0 : Math.min(Math.abs(offset) - idx * 60, 60)}px)`
                                }}
                            >
                                {action.icon}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

NoteListItem.displayName = 'NoteListItem';