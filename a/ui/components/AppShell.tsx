import React, { useEffect } from 'react';
import { Header } from './layout/Header';
import { MobileNavigation } from './layout/MobileNavigation';
import { CommandPalette } from './common/CommandPalette';
import { HelpModal } from './common/HelpModal';
import { Sidebar } from './sidebar';
import { MainView } from './MainView';

import { useNotes } from '../hooks/useNotes';
import { useSortedFilteredNotes } from '../hooks/useSortedFilteredNotes';
import { useView } from '../hooks/useViewContext';
import { useUrlRouting } from '../hooks/useUrlRouting';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useCommands } from '../hooks/useCommands';

export function AppShell() {
  const { notes, addNote } = useNotes();
  const {
    activeView,
    setActiveView,
    selectedNoteId,
    setSelectedNoteId,
    searchTerm,
    sortOrder,
    isSidebarOpen,
    userLocation,
    isPaletteOpen,
    setIsPaletteOpen,
    isHelpOpen,
    setIsHelpOpen
  } = useView();

  const sortedNotes = useSortedFilteredNotes(notes, searchTerm, sortOrder, activeView === 'trash', userLocation);

  useUrlRouting({
      activeView,
      setActiveView,
      selectedNoteId,
      setSelectedNoteId
  });

  const { commands, handleNewNote } = useCommands({ setIsHelpOpen });

  const handleCreateNote = (title: string) => {
      const newNote = addNote({ title });
      setSelectedNoteId(newNote.id);
      setActiveView('notes');
  };

  useGlobalShortcuts({
      onNewNote: handleNewNote,
      onSearch: () => {
          const searchInput = document.getElementById('sidebar-search-input');
          if (searchInput) {
              searchInput.focus();
              if (activeView !== 'notes') {
                  setActiveView('notes');
              }
          }
      },
      onCommandPalette: () => setIsPaletteOpen(true)
  });

  const sidebarClasses = [
    'flex-shrink-0 bg-gray-900 border-r border-gray-700/50',
    'transition-all duration-300 ease-in-out',
    activeView === 'notes' && !selectedNoteId ? 'w-full block' : 'hidden md:block',
    isSidebarOpen ? 'md:w-[320px]' : 'md:w-0 md:border-r-0 overflow-hidden'
  ].filter(Boolean).join(' ');

  const mainClasses = [
    'flex-1 p-3 overflow-hidden pb-20 md:pb-3',
    activeView === 'notes' && !selectedNoteId ? 'hidden md:block' : 'block'
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-200">
      <Header onNewNote={handleNewNote} />
      <div className="flex flex-1 overflow-hidden">
        <div className={sidebarClasses}>
          <Sidebar sortedNotes={sortedNotes} />
        </div>

        <main className={mainClasses}>
          <MainView sortedNotes={sortedNotes} />
        </main>
      </div>
      <MobileNavigation />
      <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          notes={sortedNotes}
          onSelectNote={(id) => {
              setSelectedNoteId(id);
              setActiveView('notes');
          }}
          onCreateNote={handleCreateNote}
          commands={commands}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
