import { useState } from 'react';
import type { Note } from '@notention/core';
import { useView } from '../../hooks/useViewContext';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../hooks/useToast';

export function useSidebarLogic(sortedNotes: Note[]) {
  const {
    searchTerm,
    setSearchTerm,
    sortOrder,
    setSortOrder,
    selectedNoteId,
    setSelectedNoteId,
    setActiveView,
    activeView,
    sidebarViewMode,
    setSidebarViewMode,
    userLocation,
    refreshUserLocation,
  } = useView();

  const { deleteNote, addNote, updateNote, restoreNote, permanentlyDeleteNote } = useNotes();
  const { addToast } = useToast();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  const isTrashView = activeView === 'trash';

  const handleDeleteRequest = (id: string) => {
    if (isTrashView) {
        setNoteToDeleteId(id);
        setIsDeleteModalOpen(true);
    } else {
        // Soft delete immediately
        if (selectedNoteId === id) {
            const currentIndex = sortedNotes.findIndex((n) => n.id === id);
            const nextNote = sortedNotes[currentIndex + 1] || sortedNotes[currentIndex - 1] || null;
            setSelectedNoteId(nextNote ? nextNote.id : null);
        }
        deleteNote(id);
        addToast('Note moved to trash', 'success');
    }
  };

  const handleDeleteConfirmed = () => {
    if (noteToDeleteId) {
      if (selectedNoteId === noteToDeleteId) {
        setSelectedNoteId(null);
      }
      permanentlyDeleteNote(noteToDeleteId);
      addToast('Note permanently deleted', 'success');
      setNoteToDeleteId(null);
    }
    setIsDeleteModalOpen(false); // Ensure modal closes
  };

  const handleRestore = (id: string) => {
      restoreNote(id);
      addToast('Note restored', 'success');
  };

  const handleCreateNote = (title?: string) => {
      const overrides: Partial<Note> = {};
      if (title && typeof title === 'string') {
          overrides.title = title;
      }

      // If this is the very first note (empty list and not a search query), add welcome content
      if (sortedNotes.length === 0 && !title && !searchTerm) {
          overrides.title = "Welcome to Notention";
          overrides.content = `
<h2>Getting Started</h2>
<p>Notention is a tool for thought that evolves into a peer-to-peer network.</p>
<ul>
    <li><strong>Semantic:</strong> Type <code>[status:is:Active]</code> to add properties.</li>
    <li><strong>Heuristic:</strong> Click the "Magic" wand to auto-tag your notes.</li>
    <li><strong>Network:</strong> Publish to Nostr to find matches.</li>
</ul>
<p>Try it out! Type "I have a meeting tomorrow" and click the Magic wand.</p>
          `.trim();
      }

      const newNote = addNote(overrides);
      setSelectedNoteId(newNote.id);
      setActiveView('notes');
      if (title) setSearchTerm('');
  };

  const handleTogglePin = (note: Note) => {
      updateNote({ ...note, pinned: !note.pinned });
      addToast(note.pinned ? 'Note unpinned' : 'Note pinned', 'info');
  };

  return {
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
  };
}
