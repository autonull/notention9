import React, {useRef, useEffect, useCallback, useMemo, useState} from 'react';
import type {Note} from '@notention/core';
import {ConfirmationModal} from '../common/ConfirmationModal';
import {NoteListItem} from './NoteListItem';
import {Search} from './Search';
import {FilterBar} from './FilterBar';
import {SortSelector} from './SortSelector';
import {ViewSelector} from './ViewSelector';
import {NoteGridItem} from './NoteGridItem';
import {PlusIcon, ChevronLeftIcon, ChevronRightIcon} from '../common/icons';
import {useSidebarLogic} from './useSidebarLogic';
import {IconButton} from '../ui/Primitives';
import {cn} from '../../utils/ui';
import {VirtualizedList} from '../ui/VirtualizedList';
import {useTouchGestures} from '../../hooks/useTouchGestures';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {SidebarSkeleton} from '../ui/Skeleton';
import {EmptyState, NotesEmptyIllustration, EmptyStatePreset} from '../common/EmptyState';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';

interface SidebarProps {
    sortedNotes?: Note[];
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    isLoading?: boolean;
    sidebarWidth?: number;
    isCollapsed?: boolean;
}

const ITEM_HEIGHT = 84;
const SIDEBAR_COLLAPSED_WIDTH = 48;

export function Sidebar({sortedNotes = [], onToggleSidebar, isSidebarOpen = true, isLoading = false, sidebarWidth = 320, isCollapsed = false}: SidebarProps) {
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

    const searchInputRef = useRef<HTMLInputElement>(null);
    const virtualListRef = useRef<{scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void; scrollToTop: () => void; scrollToBottom: () => void; focusIndex: (index: number) => void}>(null);
    const isMobile = useIsMobile();
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);

    useEffect(() => {
        if (sortOrder === 'nearest' && !userLocation) {
            refreshUserLocation();
        }
    }, [sortOrder, userLocation, refreshUserLocation]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            searchInputRef.current?.blur();
            setSearchTerm('');
        }
        // Let VirtualizedList handle arrow keys when focused
    }, [setSearchTerm]);

    const focusSearch = useCallback(() => {
        searchInputRef.current?.focus();
    }, []);

    const getItemKey = useCallback((note: Note, _index: number) => note.id, []);
    const renderItem = useCallback((note: Note, _index: number, isSelected: boolean): React.ReactNode => (
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
    ), [setSelectedNoteId, handleDeleteRequest, handleTogglePin, isTrashView, handleRestore, searchTerm]);

    // Collapsed sidebar tooltip render function
    const renderCollapsedTooltip = useCallback((note: Note) => {
        const preview = note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 120) : 'No content';
        return (
            <div className="p-3 max-w-xs">
                <p className="font-medium text-white text-sm mb-1 truncate">{note.title || 'Untitled'}</p>
                {note.pinned && <span className="inline-block px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-300 rounded border border-blue-800/50 mb-1">Pinned</span>}
                <p className="text-gray-400 text-xs line-clamp-2">{preview}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    {note.tags.length > 0 && (
                        <span className="flex gap-1">
                            {note.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">#{tag}</span>
                            ))}
                        </span>
                    )}
                </div>
            </div>
        );
    }, []);

    const touchElementRef = useRef<HTMLDivElement>(null);
    const {isPulling, pullDistance, pullProgress} = useTouchGestures({
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
    
    // Bridge the touch gesture ref to our div ref
    const touchRef = useCallback((el: HTMLDivElement | null) => {
        touchElementRef.current = el;
    }, []);

    const containerHeight = useMemo(() => {
        if (isMobile) return window.innerHeight - 200;
        return window.innerHeight - 180;
    }, [isMobile]);

    const filteredNotes = useMemo(() => {
        if (!showPinnedOnly) return sortedNotes;
        return sortedNotes.filter(note => note.pinned);
    }, [sortedNotes, showPinnedOnly]);

    const showFullContent = isSidebarOpen && !isCollapsed && sidebarWidth > SIDEBAR_COLLAPSED_WIDTH;

    if (isLoading) {
        return <SidebarSkeleton/>;
    }

    return (
        <div className={cn('bg-gray-900 flex flex-col h-full transition-all duration-300 ease-in-out')}>
            <div className={cn(
                'flex-shrink-0 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10 transition-all duration-200',
                showFullContent ? 'p-3 space-y-3' : 'p-2 space-y-2 items-center'
            )}>
                <div className={cn('flex items-center gap-2 w-full', showFullContent ? '' : 'justify-center')}>
                    <div className={cn('flex-grow relative group transition-all duration-200', !showFullContent && 'w-10')}>
                        <Search
                            ref={searchInputRef}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            onFocus={focusSearch}
                            placeholder={showFullContent ? 'Search notes...' : ''}
                            aria-label="Search notes"
                        />
                    </div>
                    {!showFullContent && onToggleSidebar && (
                        <IconButton
                            onClick={onToggleSidebar}
                            tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            tooltipPosition="right"
                            icon={isCollapsed ? ChevronRightIcon : ChevronLeftIcon}
                            variant="ghost"
                            size="md"
                            className="flex-shrink-0 touch-target-48"
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        />
                    )}
                    {showFullContent && (
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

                {showFullContent && (
                    <>
                        <div className="flex items-center gap-2 overflow-hidden" role="group" aria-label="View and filter options">
                            <div className="flex-grow min-w-0">
                                <FilterBar searchTerm={searchTerm} onSetSearch={setSearchTerm} notes={sortedNotes}/>
                            </div>
                            <div className="flex items-center gap-1 border-l border-gray-700/50 pl-2">
                                <ViewSelector viewMode={sidebarViewMode} onViewChange={setSidebarViewMode}/>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-1" role="group" aria-label="Sort and filter options">
                            <SortSelector sortOrder={sortOrder} onSortChange={setSortOrder}/>
                            {sortedNotes.some(n => n.pinned) && (
                                <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer touch-target-48">
                                    <input
                                        type="checkbox"
                                        checked={showPinnedOnly}
                                        onChange={(e) => setShowPinnedOnly(e.target.checked)}
                                        className="w-4 h-4 accent-blue-500 rounded border-gray-700 bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                        aria-label="Show pinned only"
                                    />
                                    <span className="hidden sm:inline">Pinned only</span>
                                    <span className="sm:hidden" aria-hidden="true">📌</span>
                                </label>
                            )}
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
                {filteredNotes.length > 0 ? (
                    sidebarViewMode === 'grid' ? (
                        <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto custom-scrollbar" role="list">
                            {filteredNotes.map((note) => (
                                <NoteGridItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => setSelectedNoteId(note.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <VirtualizedList
                            ref={virtualListRef}
                            items={filteredNotes}
                            itemHeight={ITEM_HEIGHT}
                            containerHeight={containerHeight}
                            getItemKey={getItemKey}
                            selectedKey={selectedNoteId}
                            overscan={8}
                            className="h-full"
                            keyboardNavigation
                            role="listbox"
                            aria-label={isTrashView ? 'Trash notes' : 'Notes'}
                            onItemClick={(note) => setSelectedNoteId(note.id)}
                            collapsedTooltip={!showFullContent ? renderCollapsedTooltip : undefined}
                        >
                            {renderItem}
                        </VirtualizedList>
                    )
                ) : (
                    <>
                        {isTrashView ? (
                            <EmptyStatePreset type="emptyTrash" />
                        ) : searchTerm ? (
                            <EmptyStatePreset
                                type="noMatches"
                                searchTerm={searchTerm}
                                onClearSearch={() => setSearchTerm('')}
                            />
                        ) : sortedNotes.length === 0 ? (
                            <EmptyStatePreset
                                type="firstNote"
                                onCreateNote={() => handleCreateNote()}
                                onLoadSample={loadSampleWorkspace}
                            />
                        ) : (
                            <EmptyState
                                variant="illustrated"
                                illustration={<NotesEmptyIllustration/>}
                                title="No notes match your filters"
                                description="Try adjusting your filters or sort order."
                                hint="Press ⌘/ to search, or use filters to narrow results"
                                showShortcuts
                                shortcutContext="notes"
                            />
                        )}
                    </>
                )}
            </div>

            {isMobile && isPulling && (
                <div className="pull-to-refresh flex items-center justify-center px-4 py-3 text-sm" style={{height: Math.max(60, pullDistance)}}>
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
                            {pullProgress >= 1 ? 'Refreshing...' : pullProgress > 0.5 ? 'Release to refresh' : 'Pull to refresh'}
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