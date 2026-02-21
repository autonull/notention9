import React from 'react';
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
import {PlusIcon} from '../common/icons';
import {useSidebarLogic} from './useSidebarLogic';
import {IconButton} from '../common/IconButton';

interface SidebarProps {
    sortedNotes?: Note[];
}

export function Sidebar({sortedNotes = []}: SidebarProps) {
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

    React.useEffect(() => {
        if (sortOrder === 'nearest' && !userLocation) {
            refreshUserLocation();
        }
    }, [sortOrder, userLocation, refreshUserLocation]);

    const handleTagClick = (tag: string) => {
        setSearchTerm(`#${tag}`);
    };

    return (
        <div className="bg-gray-900 flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-gray-700/50 p-4 space-y-4 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="flex-grow relative group">
                        <div className="absolute inset-0 bg-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>
                    </div>
                    <IconButton
                        onClick={() => handleCreateNote()}
                        tooltip="New Note (Ctrl+N)"
                        tooltipPosition="bottom"
                        icon={PlusIcon}
                        variant="primary"
                        size="lg"
                        containerClassName="flex-shrink-0 shadow-lg shadow-blue-500/20"
                    />
                </div>

                <FilterBar searchTerm={searchTerm} onSetSearch={setSearchTerm}/>

                <div className="flex gap-2 items-center justify-between">
                    <div className="flex-grow max-w-[70%]">
                        <SortSelector sortOrder={sortOrder} onSortChange={setSortOrder}/>
                    </div>
                    <ViewSelector viewMode={sidebarViewMode} onViewChange={setSidebarViewMode}/>
                </div>
            </div>

            <div className="flex-grow px-2 py-3 overflow-y-auto custom-scrollbar space-y-1">
                {sortedNotes.length > 0 ? (
                    sidebarViewMode === 'list' ? (
                        sortedNotes.map((note) => (
                            <NoteListItem
                                key={note.id}
                                note={note}
                                isSelected={selectedNoteId === note.id}
                                onSelect={() => setSelectedNoteId(note.id)}
                                onDelete={() => handleDeleteRequest(note.id)}
                                onPin={!isTrashView ? () => handleTogglePin(note) : undefined}
                                isTrash={isTrashView}
                                onRestore={() => handleRestore(note.id)}
                            />
                        ))
                    ) : sidebarViewMode === 'grid' ? (
                        <div className="grid grid-cols-2 gap-2">
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
