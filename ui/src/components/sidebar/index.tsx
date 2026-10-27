import React, {useRef, useEffect, useCallback, useMemo, useState} from 'react';
import type {Note} from '@notention/core';
import {ConfirmationModal} from '../ui/Primitives';
import {SidebarHeader} from './SidebarHeader';
import {SidebarList} from './SidebarList';
import {SidebarPullToRefresh} from './SidebarPullToRefresh';
import {useSidebarLogic} from './useSidebarLogic';
import {NoteListItem} from './NoteListItem';
import {NoteGridItem} from './NoteGridItem';
import {IconButton} from '../ui/Button';
import {cn} from '../../utils/ui';
import {VirtualizedList} from '../ui/VirtualizedList';
import {useTouchGestures} from '../../hooks/useTouchGestures';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {SidebarSkeleton} from '../ui/Skeleton';
import {EmptyStatePreset} from '../ui/Primitives';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {modShortcut} from '../../utils/platform';
import {ITEM_HEIGHT, SIDEBAR_COLLAPSED_WIDTH} from '../../constants/ui';
import {NotesEmptyIllustration, EmptyState} from '../ui/Primitives';
import {PlusIcon, ChevronLeftIcon, ChevronRightIcon} from '../ui/icons';

interface SidebarProps {
    sortedNotes?: Note[];
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    isLoading?: boolean;
    sidebarWidth?: number;
    isCollapsed?: boolean;
}

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
            <SidebarHeader
                searchInputRef={searchInputRef}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                focusSearch={focusSearch}
                onToggleSidebar={onToggleSidebar}
                handleCreateNote={handleCreateNote}
                isCollapsed={isCollapsed}
                showFullContent={showFullContent}
                sidebarViewMode={sidebarViewMode}
                setSidebarViewMode={setSidebarViewMode}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                sortedNotes={sortedNotes}
                showPinnedOnly={showPinnedOnly}
                setShowPinnedOnly={setShowPinnedOnly}
            />
            <SidebarList
                ref={touchRef}
                filteredNotes={filteredNotes}
                sortedNotes={sortedNotes}
                isLoading={isLoading}
                isMobile={isMobile}
                containerHeight={containerHeight}
                virtualListRef={virtualListRef}
                sidebarViewMode={sidebarViewMode}
                selectedNoteId={selectedNoteId}
                setSelectedNoteId={setSelectedNoteId}
                isTrashView={isTrashView}
                showFullContent={showFullContent}
                renderItem={renderItem}
                getItemKey={getItemKey}
                renderCollapsedTooltip={renderCollapsedTooltip}
                loadSampleWorkspace={loadSampleWorkspace}
                handleCreateNote={handleCreateNote}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <SidebarPullToRefresh
                isMobile={isMobile}
                isPulling={isPulling}
                pullDistance={pullDistance}
                pullProgress={pullProgress}
                refreshUserLocation={refreshUserLocation}
            />
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