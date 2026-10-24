import React, {useRef, useEffect, useCallback, useMemo, useState} from 'react';
import type {Note} from '@notention/core';
import {ConfirmationModal} from '../common/ConfirmationModal';
import {NoteListItem} from './NoteListItem';
import {Search} from './Search';
import {FilterBar} from './FilterBar';
import {SortSelector} from './SortSelector';
import {ViewSelector} from './ViewSelector';
import {NoteGridItem} from './NoteGridItem';
import {TagCloud} from './TagCloud';
import {SidebarEmptyState} from './SidebarEmptyState';
import {PlusIcon, ChevronLeftIcon, GridIcon, ListIcon, TagIcon} from '../common/icons';
import {useSidebarLogic} from './useSidebarLogic';
import {IconButton} from '../common/IconButton';
import {cn} from '../../utils/ui';
import {VirtualizedList} from '../ui/VirtualizedList';
import {useTouchGestures} from '../../hooks/useTouchGestures';
import {Skeleton, NoteItemSkeleton, SidebarSkeleton} from '../ui/Skeleton';

interface SidebarProps {
    sortedNotes?: Note[];
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    isLoading?: boolean;
}

const ITEM_HEIGHT = 84;

export function Sidebar({sortedNotes = [], onToggleSidebar, isSidebarOpen = true, isLoading = false}: SidebarProps) {
    const {
        searchTerm,
        setSearchTerm,
        sortOrder,
        setSortOrder,
        selectedNoteId,
        setSelectedNoteId,
        isTrashView,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleDeleteRequest,
        handleDeleteConfirmed,
        handleRestore,
        handleCreateNote,
        handleTogglePin,
        sidebarViewMode,
        setSidebarViewMode,
        userLocation,
        refreshUserLocation
    } = useSidebarLogic(sortedNotes);

    const listRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const virtualListRef = useRef<{scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void}>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isMobile, setIsMobile] = useState(false);

    if (isLoading) {
        return <SidebarSkeleton/>;
    }

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (sortOrder === 'nearest' && !userLocation) {
            refreshUserLocation();
        }
    }, [sortOrder, userLocation, refreshUserLocation]);

    const handleTagClick = useCallback((tag: string) => {
        setSearchTerm(`#${tag}`);
    }, [setSearchTerm]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            searchInputRef.current?.blur();
            setSearchTerm('');
        }
    }, [setSearchTerm]);

    const focusSearch = useCallback(() => {
        searchInputRef.current?.focus();
    }, []);

    const viewModeIcons = {
        list: ListIcon,
        grid: GridIcon,
        tags: TagIcon,
    };

    const getItemKey = useCallback((note: Note, index: number) => note.id, []);
    const renderItem = useCallback((note: Note, index: number, isSelected: boolean) => (
        <NoteListItem
            key={note.id}
            note={note}
            isSelected={isSelected}
            onSelect={() => setSelectedNoteId(note.id)}
            onDelete={() => handleDeleteRequest(note.id)}
            onPin={!isTrashView ? () => handleTogglePin(note) : undefined}
            isTrash={isTrashView}
            onRestore={() => handleRestore(note.id)}
            searchTerm={searchTerm}
        />
    ), [selectedNoteId, setSelectedNoteId, handleDeleteRequest, handleTogglePin, isTrashView, handleRestore, searchTerm]);

    const {ref: touchRef, isPulling, pullDistance, pullProgress} = useTouchGestures({
        onPullToRefresh: async () => {
            refreshUserLocation();
        },
        onSwipeLeft: () => {
            if (isMobile && isSidebarOpen && onToggleSidebar) {
                onToggleSidebar();
            }
        },
        disabled: !isMobile,
    });

    const containerHeight = useMemo(() => {
        if (isMobile) return window.innerHeight - 200;
        return window.innerHeight - 180;
    }, [isMobile]);

    return (
        <div className={cn('bg-gray-900 flex flex-col h-full transition-all duration-300 ease-in-out')}>
            <div className={cn(
                'flex-shrink-0 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10',
                isSidebarOpen ? 'p-3 space-y-3' : 'p-2 space-y-2'
            )}>
                <div className="flex items-center gap-2">
                    <div className={cn('flex-grow relative group transition-all duration-200', !isSidebarOpen && 'w-10')}>
                        <Search
                            ref={searchInputRef}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            onFocus={focusSearch}
                            placeholder={isSidebarOpen ? 'Search notes...' : ''}
                            aria-label="Search notes"
                        />
                    </div>
                    {!isSidebarOpen && onToggleSidebar && (
                        <IconButton
                            onClick={onToggleSidebar}
                            tooltip="Expand Sidebar"
                            tooltipPosition="right"
                            icon={ChevronLeftIcon}
                            variant="ghost"
                            size="md"
                            className="flex-shrink-0"
                            aria-label="Expand sidebar"
                        />
                    )}
                    {isSidebarOpen && (
                        <IconButton
                            onClick={() => handleCreateNote()}
                            tooltip="New Note (Ctrl+N)"
                            tooltipPosition="bottom"
                            icon={PlusIcon}
                            variant="primary"
                            size="md"
                            containerClassName="flex-shrink-0 shadow-lg shadow-blue-500/20"
                            aria-label="Create new note"
                        />
                    )}
                </div>

                {isSidebarOpen && (
                    <>
                        <div className="flex items-center gap-2 overflow-hidden" role="group" aria-label="View and filter options">
                            <div className="flex-grow min-w-0">
                                <FilterBar searchTerm={searchTerm} onSetSearch={setSearchTerm}/>
                            </div>
                            <div className="flex items-center gap-1 border-l border-gray-700/50 pl-2">
                                <ViewSelector viewMode={sidebarViewMode} onViewChange={setSidebarViewMode}/>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-1" role="group" aria-label="Sort options">
                            <SortSelector sortOrder={sortOrder} onSortChange={setSortOrder}/>
                        </div>
                    </>
                )}
            </div>

            <div
                ref={touchRef}
                className="flex-grow px-2 py-3 overflow-hidden custom-scrollbar"
                role="list"
                aria-label={isTrashView ? 'Trash notes' : 'Notes'}
                onKeyDown={handleKeyDown}
            >
                {sortedNotes.length > 0 ? (
                    sidebarViewMode === 'list' ? (
                        <VirtualizedList<Note>
                            ref={virtualListRef}
                            items={sortedNotes}
                            itemHeight={ITEM_HEIGHT}
                            containerHeight={containerHeight}
                            getItemKey={getItemKey}
                            renderItem={renderItem}
                            selectedKey={selectedNoteId}
                            overscan={8}
                            className="h-full"
                        />
                    ) : sidebarViewMode === 'grid' ? (
                        <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto custom-scrollbar" role="list">
                            {sortedNotes.map((note) => (
                                <NoteGridItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => setSelectedNoteId(note.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <TagCloud notes={sortedNotes} onTagClick={handleTagClick}/>
                    )
                ) : (
                    <SidebarEmptyState
                        searchTerm={searchTerm}
                        isTrashView={isTrashView}
                        onCreateNote={handleCreateNote}
                    />
                )}
            </div>

            {isMobile && isPulling && (
                <div className="flex items-center justify-center px-4 py-3 text-sm" style={{height: Math.max(60, pullDistance)}}>
                    <div className="flex flex-col items-center gap-2 transition-all duration-200">
                        <div className={cn(
                            'w-8 h-8 border-2 rounded-full transition-all duration-200 flex items-center justify-center',
                            pullProgress >= 1
                                ? 'border-blue-500 animate-spin'
                                : 'border-gray-600'
                        )} style={{transform: `rotate(${pullProgress * 360}deg)`}}>
                            {pullProgress >= 1 ? (
                                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{transform: `rotate(${-90 + pullProgress * 90}deg)`}}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            )}
                        </div>
                        <span className={cn('transition-colors duration-200', pullProgress >= 1 ? 'text-blue-400 font-medium' : 'text-gray-500')}>
                            {pullProgress >= 1 ? 'Refreshing...' : 'Pull to refresh'}
                        </span>
                        <div className="w-32 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-100 ease-out" style={{width: `${pullProgress * 100}%`}}/>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirmed}
                title="Permanently Delete Note"
                message="Are you sure you want to permanently delete this note? This action cannot be undone."
                confirmLabel="Delete Forever"
                isDestructive
            />
        </div>
    );
}