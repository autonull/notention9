import {useState} from 'react';
import type {Note} from '@notention/core';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';

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

    const {deleteNote, addNote, updateNote, restoreNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();

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
    <li><strong>Quick Capture:</strong> Use the Dashboard to instantly create Tasks, Ideas, or Journal entries.</li>
    <li><strong>Organize:</strong> Use the Assistant sidebar (✨) to manage properties like <code>[status:is:Active]</code>.</li>
    <li><strong>Retrieve:</strong> Use the sidebar filters to quickly find Tasks or Ideas.</li>
    <li><strong>Network:</strong> Publish to Nostr to find matches in the P2P economy.</li>
</ul>
<p>Try it out! Create a note, add <code>[type:is:idea]</code>, and see it appear in the "Ideas" filter.</p>
          `.trim();
        }

        const newNote = addNote(overrides);
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
        if (title) setSearchTerm('');
    };

    const handleTogglePin = (note: Note) => {
        updateNote({...note, pinned: !note.pinned});
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
