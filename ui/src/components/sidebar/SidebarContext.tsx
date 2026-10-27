import React, { createContext, ReactNode, useContext, useCallback, useState, useMemo } from 'react';
import type { Note, SidebarViewMode, SortOrder } from '@notention/core';
import { useLocalForage } from '../../hooks/useLocalForage';
import { useViewNavigation, useViewSelection, useViewLocation } from '../../hooks/useViewContext';
import { useNotes } from '../../hooks/useNotes';
import { useToast } from '../../hooks/useToast';
import { useDemoWorkspace } from '../../hooks/useDemoWorkspace';
import { STORAGE_KEYS } from '../../config/storageKeys';

interface SidebarContextType {
    filteredNotes: Note[];
    sortedNotes: Note[];
    isLoading: boolean;
    isMobile: boolean;
    containerHeight: number;
    sidebarViewMode: SidebarViewMode;
    setSidebarViewMode: (mode: SidebarViewMode) => void;
    selectedNoteId: string | null;
    setSelectedNoteId: (id: string | null) => void;
    isTrashView: boolean;
    showFullContent: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    sortOrder: SortOrder;
    setSortOrder: (order: SortOrder) => void;
    renderItem: (note: Note, index: number, isSelected: boolean) => React.ReactNode;
    getItemKey: (note: Note, index: number) => string;
    renderCollapsedTooltip: (note: Note) => React.ReactNode;
    loadSampleWorkspace: () => void;
    handleCreateNote: () => void;
    handleDeleteRequest: (id: string) => void;
    handleRestore: (id: string) => void;
    handleTogglePin: (note: Note) => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (open: boolean) => void;
    handleDeleteConfirmed: () => void;
    showPinnedOnly: boolean;
    setShowPinnedOnly: (show: boolean) => void;
    refreshUserLocation: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
    children: ReactNode;
    sortedNotes: Note[];
    isLoading: boolean;
    sidebarWidth: number;
    isCollapsed: boolean;
    isSidebarOpen: boolean;
    onToggleSidebar?: () => void;
}

export function SidebarProvider({
    children,
    sortedNotes,
    isLoading,
    sidebarWidth,
    isCollapsed,
    isSidebarOpen,
    onToggleSidebar
}: SidebarProviderProps) {
    const { searchTerm, setSearchTerm, sortOrder, setSortOrder, sidebarViewMode, setSidebarViewMode, isSidebarOpen: viewSidebarOpen } = useViewNavigation();
    const { selectedNoteId, setSelectedNoteId, matchingNoteId, setMatchingNoteId } = useViewSelection();
    const { userLocation, refreshUserLocation } = useViewLocation();
    const { deleteNote, addNote, updateNote, restoreNote, permanentlyDeleteNote } = useNotes();
    const { addToast } = useToast();
    const { load: loadSampleWorkspace } = useDemoWorkspace();
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

    const isTrashView = useViewNavigation().activeView === 'trash';

    const handleDeleteRequest = useCallback((id: string) => {
        if (isTrashView) {
            setNoteToDeleteId(id);
            setIsDeleteModalOpen(true);
        } else {
            if (selectedNoteId === id) {
                const currentIndex = sortedNotes.findIndex((n) => n.id === id);
                const nextNote = sortedNotes[currentIndex + 1] || sortedNotes[currentIndex - 1] || null;
                setSelectedNoteId(nextNote ? nextNote.id : null);
            }
            deleteNote(id);
            addToast('Note moved to trash', 'success');
        }
    }, [isTrashView, selectedNoteId, sortedNotes, setSelectedNoteId, deleteNote, addToast]);

    const handleDeleteConfirmed = useCallback(() => {
        if (noteToDeleteId) {
            if (selectedNoteId === noteToDeleteId) {
                setSelectedNoteId(null);
            }
            permanentlyDeleteNote(noteToDeleteId);
            addToast('Note permanently deleted', 'success');
            setNoteToDeleteId(null);
        }
        setIsDeleteModalOpen(false);
    }, [noteToDeleteId, selectedNoteId, setSelectedNoteId, permanentlyDeleteNote, addToast]);

    const handleRestore = useCallback((id: string) => {
        restoreNote(id);
        addToast('Note restored', 'success');
    }, [restoreNote, addToast]);

    const handleCreateNote = useCallback((title?: string) => {
        const overrides: Partial<Note> = {};
        if (title && typeof title === 'string') {
            overrides.title = title;
        }

        if (sortedNotes.length === 0 && !title && !searchTerm) {
            overrides.title = "Welcome to Notention";
            overrides.content = `
<h2>Getting Started</h2>
<p>Notention is a tool for thought that evolves into a peer-to-peer network.</p>
<ul>
    <li><strong>Quick Capture:</strong> Use the Dashboard to instantly create Tasks, Ideas, or Journal entries.</li>
    <li><strong>Add details:</strong> Use the Add detail button in the editor to attach structured facts like a status, price, or deadline. Details render as chips.</li>
    <li><strong>Retrieve:</strong> Use the sidebar filters to quickly find Tasks or Ideas.</li>
    <li><strong>Network:</strong> Publish to Nostr to find matches in the P2P economy.</li>
</ul>
<p>Try it out! Create a note, add an "idea" detail, and see it appear in the Ideas filter.</p>
      `.trim();
        }

        const newNote = addNote(overrides);
        setSelectedNoteId(newNote.id);
        useViewNavigation().setActiveView('notes');
        if (title) setSearchTerm('');
    }, [sortedNotes.length, searchTerm, addNote, setSelectedNoteId, setSearchTerm]);

    const handleTogglePin = useCallback((note: Note) => {
        updateNote({ ...note, pinned: !note.pinned });
        addToast(note.pinned ? 'Note unpinned' : 'Note pinned', 'info');
    }, [updateNote, addToast]);

    const showFullContent = isSidebarOpen && !isCollapsed && sidebarWidth > 48;

    const filteredNotes = useMemo(() => {
        if (!showPinnedOnly) return sortedNotes;
        return sortedNotes.filter(note => note.pinned);
    }, [sortedNotes, showPinnedOnly]);

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

    const containerHeight = useMemo(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) return window.innerHeight - 200;
        return window.innerHeight - 180;
    }, [isSidebarOpen]);

    return (
        <SidebarContext.Provider
            value={{
                filteredNotes,
                sortedNotes,
                isLoading,
                isMobile: window.innerWidth < 768,
                containerHeight,
                sidebarViewMode,
                setSidebarViewMode,
                selectedNoteId,
                setSelectedNoteId,
                isTrashView,
                showFullContent,
                searchTerm,
                setSearchTerm,
                sortOrder,
                setSortOrder,
                renderItem,
                getItemKey,
                renderCollapsedTooltip,
                loadSampleWorkspace,
                handleCreateNote,
                handleDeleteRequest,
                handleRestore,
                handleTogglePin,
                isDeleteModalOpen,
                setIsDeleteModalOpen,
                handleDeleteConfirmed,
                showPinnedOnly,
                setShowPinnedOnly,
                refreshUserLocation
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
    return ctx;
};

export { SidebarContext };