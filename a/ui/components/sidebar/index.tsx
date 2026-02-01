import React from 'react';
import type { Note } from '@notention/core';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { NoteListItem } from './NoteListItem';
import { SidebarHeader } from './SidebarHeader';
import { NoteGridItem } from './NoteGridItem';
import { TagCloud } from './TagCloud';
import { SidebarEmptyState } from './SidebarEmptyState';
import { useSidebarLogic } from './useSidebarLogic';

interface SidebarProps {
  sortedNotes?: Note[];
}

export function Sidebar({ sortedNotes = [] }: SidebarProps) {
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
      <SidebarHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        viewMode={sidebarViewMode}
        onViewChange={setSidebarViewMode}
        onCreateNote={handleCreateNote}
      />

      <div className="flex-grow p-2 overflow-y-auto custom-scrollbar">
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
              <TagCloud notes={sortedNotes} onTagClick={handleTagClick} />
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
