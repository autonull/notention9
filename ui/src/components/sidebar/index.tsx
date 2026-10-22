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

interface SidebarProps {
    sortedNotes?: Note[];
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

const ITEM_HEIGHT = 84;

export function Sidebar({sortedNotes = [], onToggleSidebar, isSidebarOpen = true}: SidebarProps) {
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
        />
    ), [selectedNoteId, setSelectedNoteId, handleDeleteRequest, handleTogglePin, isTrashView, handleRestore]);

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
                <div className="flex items-center justify-center px-4 py-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        <span>Pull to refresh...</span>
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