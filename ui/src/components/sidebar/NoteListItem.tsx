import React, {useRef, useState, useEffect} from 'react';
import type {Note} from '@notention/core';
import {DocumentDuplicateIcon, PinIcon, TrashIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {cn} from '../../utils/ui';
import {useSwipeActions, type SwipeActionItem} from '../../hooks/useTouchGestures';
import {useNoteDisplay, useHighlightedText, useHighlightedPreview, getNoteItemClasses, getPropertyBadgeClasses, getRelativeTimeClasses, formatPropertyChip} from './useNoteDisplay';
import {noteAccentClass} from '../../utils/noteAccent';

interface NoteListItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete?: () => void;
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

    const metaChips = displayProperties.length > 0
        ? displayProperties.map(formatPropertyChip)
        : note.tags.slice(0, 1).map(tag => `#${tag}`);

    const swipeActions: SwipeActionItem[] = isMobile ? [
        ...(!isTrash && onPin ? [{
            id: 'pin',
            label: isPinned ? 'Unpin' : 'Pin',
            icon: <PinIcon className="w-5 h-5"/>,
            onClick: () => onPin!(),
            variant: isPinned ? 'default' : 'primary',
            backgroundColor: isPinned ? '#3b82f6' : '#22c55e',
        } as const] : []),
        ...(isTrash && onRestore ? [{
            id: 'restore',
            label: 'Restore',
            icon: <DocumentDuplicateIcon className="w-5 h-5 transform rotate-180"/>,
            onClick: () => onRestore!(),
            variant: 'primary',
            backgroundColor: '#16a34a',
        } as const] : []),
        {
            id: 'delete',
            label: isTrash ? 'Delete' : 'Trash',
            icon: <TrashIcon className="w-5 h-5"/>,
            onClick: () => onDelete?.(),
            variant: 'destructive',
            backgroundColor: '#dc2626',
        } as const,
    ] : [];

    const {
        ref: swipeRef,
        style: swipeStyle,
        offset,
        activeSide,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    } = useSwipeActions({
        leftActions: [],
        rightActions: swipeActions,
        threshold: 80,
    });

    const divRef = swipeRef as React.LegacyRef<HTMLDivElement>;
    const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => handleTouchStart(e as unknown as TouchEvent);
    const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => handleTouchMove(e as unknown as TouchEvent);
    const onTouchEnd = () => handleTouchEnd();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.();
        } else if (e.key.toLowerCase() === 'p' && onPin) {
            e.preventDefault();
            e.stopPropagation();
            onPin();
        }
    };

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
            ref={divRef}
            style={swipeStyle as React.CSSProperties}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className={cn(itemClasses, noteAccentClass(note))}
        >
            <span
                aria-hidden="true"
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--note-accent)]"
            />

            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <h3 className={cn(
                        'truncate text-[13px] font-medium leading-5 transition-colors',
                        isSelected ? 'text-[var(--app-text)]' : 'text-[var(--app-text-secondary)]'
                    )}>
                        {highlightedTitle}
                    </h3>
                    {isPinned && <PinIcon className="h-3 w-3 shrink-0 text-[var(--app-accent-text)]"/>}
                    {metaChips.length > 0 && (
                        <span className="hidden shrink-0 items-center gap-1 md:flex">
                            {metaChips.map((label, i) => (
                                <span key={`${label}-${i}`} className={getPropertyBadgeClasses(isSelected)}>
                                    {label}
                                </span>
                            ))}
                        </span>
                    )}
                    <span className={cn('ml-auto shrink-0', getRelativeTimeClasses(isSelected))}>
                        {relativeTime}
                    </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] leading-5 text-[var(--app-muted)]">
                    {highlightedPreview}
                </p>
            </div>

            {!isMobile && (
                <div className={cn(
                    'flex shrink-0 items-center gap-0.5 transition-opacity',
                    isTrash ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                )}>
                    {isTrash && onRestore && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            tabIndex={-1}
                            className="p-1"
                            icon={() => <DocumentDuplicateIcon className="h-3.5 w-3.5 transform rotate-180"/>}
                            size="xs"
                            variant="ghost"
                            aria-label="Restore note"
                        />
                    )}
                    {onPin && !isTrash && (
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); onPin(); }}
                            tabIndex={-1}
                            className={cn('p-1', isPinned ? 'text-[var(--app-accent-text)]' : undefined)}
                            icon={PinIcon}
                            size="xs"
                            variant="ghost"
                            aria-label={isPinned ? 'Unpin note' : 'Pin note'}
                        />
                    )}
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                        tabIndex={-1}
                        className="p-1 hover:text-red-400"
                        icon={TrashIcon}
                        size="xs"
                        variant="ghost"
                        aria-label={isTrash ? 'Delete permanently' : 'Move to trash'}
                    />
                </div>
            )}

            {isMobile && activeSide && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-4" aria-hidden="true">
                    {swipeActions.slice(-3).map((action, idx) => (
                        <div
                            key={action.id}
                            className="mr-1 flex h-10 w-10 items-center justify-center rounded-lg text-xs font-medium text-white transition-opacity"
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
    );
});

NoteListItem.displayName = 'NoteListItem';
