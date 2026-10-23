import React, {useEffect, useState} from 'react';
import {Header} from './layout/Header';
import {MobileNavigation} from './layout/MobileNavigation';
import {CommandPalette} from './common/CommandPalette';
import {Sidebar} from './sidebar';
import {MainView} from './MainView';
import {SelectorRegistryProvider} from './properties/SelectorRegistry';
import {KeyboardShortcutsHelp} from './common/KeyboardShortcutsHelp';

import {useNotes} from '../hooks/useNotes';
import {useView} from '../hooks/useViewContext';
import {useUrlRouting} from '../hooks/useUrlRouting';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useCommands} from '../hooks/useCommands';
import {HelpDialog} from './modals/HelpDialog';
import {ConnectivityBanner} from './layout/ConnectivityBanner';
import {useToast} from '../hooks/useToast';
import {cn} from '../utils/ui';

export function AppShell() {
    const {addNote, getSortedFilteredNotes} = useNotes();
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        searchTerm,
        sortOrder,
        isSidebarOpen,
        setIsSidebarOpen,
        userLocation,
        isPaletteOpen,
        setIsPaletteOpen,
        isHelpOpen,
        setIsHelpOpen
    } = useView();

    const sortedNotes = getSortedFilteredNotes(searchTerm, sortOrder, activeView === 'trash', userLocation);

    useUrlRouting({
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId
    });

    const {commands, handleNewNote} = useCommands({setIsHelpOpen});
    const {addToast} = useToast();

    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

    useEffect(() => {
        const handleStorageError = (event: Event) => {
            const detail = (event as CustomEvent<{key: string; message: string}>).detail;
            addToast(`Could not save ${detail?.key ?? 'data'}. Storage may be full.`, 'error');
        };
        const handleOpenShortcutsHelp = () => setIsShortcutsHelpOpen(true);
        window.addEventListener('storage-error', handleStorageError);
        window.addEventListener('open-shortcuts-help', handleOpenShortcutsHelp);
        return () => {
            window.removeEventListener('storage-error', handleStorageError);
            window.removeEventListener('open-shortcuts-help', handleOpenShortcutsHelp);
        };
    }, [addToast, setIsShortcutsHelpOpen]);

    const handleCreateNote = (title: string) => {
        const newNote = addNote({title});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    };

    useKeyboardShortcuts({
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
        onCommandPalette: () => setIsPaletteOpen(true),
        onPropertyPalette: () => {
            window.dispatchEvent(new CustomEvent('open-property-palette'));
        },
        onSave: () => {
            window.dispatchEvent(new CustomEvent('save-note'));
            setTimeout(() => {
                const saveButton = document.querySelector('button[data-action="save"]');
                if (saveButton) {
                    (saveButton as HTMLButtonElement).click();
                }
            }, 0);
        },
        onPreviousNote: () => {
            if (sortedNotes.length > 0 && selectedNoteId) {
                const currentIndex = sortedNotes.findIndex(note => note.id === selectedNoteId);
                if (currentIndex > 0) {
                    setSelectedNoteId(sortedNotes[currentIndex - 1].id);
                }
            }
        },
        onNextNote: () => {
            if (sortedNotes.length > 0 && selectedNoteId) {
                const currentIndex = sortedNotes.findIndex(note => note.id === selectedNoteId);
                if (currentIndex < sortedNotes.length - 1) {
                    setSelectedNoteId(sortedNotes[currentIndex + 1].id);
                }
            }
        },
        onBackToList: () => {
            setSelectedNoteId(null);
            if (activeView !== 'notes') {
                setActiveView('notes');
            }
        },
        onToggleSidebar: () => {
            if (window.innerWidth < 768) {
                setMobileSidebarOpen(!mobileSidebarOpen);
            } else {
                setIsSidebarOpen(!isSidebarOpen);
            }
        },
        onEscape: () => {
            setIsPaletteOpen(false);
            setIsHelpOpen(false);
            setIsShortcutsHelpOpen(false);
            setMobileSidebarOpen(false);
        },
        onShortcutsHelp: () => setIsShortcutsHelpOpen(true),
    });

    const isMobileNoteList = activeView === 'notes' && !selectedNoteId;
    const isMobile = window.innerWidth < 768;

    const sidebarClasses = cn(
        'flex-shrink-0 bg-gray-900 border-r border-gray-700/50 transition-all duration-300 ease-in-out',
        isMobileNoteList ? 'w-full block' : 'hidden md:block',
        isMobile ? (mobileSidebarOpen ? 'w-[320px]' : 'w-0 border-r-0 overflow-hidden') : (isSidebarOpen ? 'md:w-[320px]' : 'md:w-0 md:border-r-0 overflow-hidden')
    );

    const mainClasses = cn(
        'flex-1 overflow-hidden pb-20 md:pb-0',
        isMobileNoteList ? 'hidden md:block' : 'block'
    );

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileSidebarOpen(!mobileSidebarOpen);
        } else {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    return (
        <SelectorRegistryProvider>
            <div className="flex flex-col h-screen bg-gray-950 text-gray-200" data-ready>
                <Header onNewNote={handleNewNote}/>
                <ConnectivityBanner/>
                <div className="flex flex-1 overflow-hidden relative">
                    <div className={sidebarClasses}>
                        <Sidebar
                            sortedNotes={sortedNotes}
                            onToggleSidebar={toggleSidebar}
                            isSidebarOpen={isMobile ? mobileSidebarOpen : isSidebarOpen}
                        />
                    </div>

                    {isMobile && mobileSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setMobileSidebarOpen(false)}
                            aria-hidden="true"
                        />
                    )}

                    <main className={mainClasses}>
                        <MainView sortedNotes={sortedNotes}/>
                    </main>
                </div>
                <MobileNavigation/>
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
                <HelpDialog
                    isOpen={isHelpOpen}
                    onClose={() => setIsHelpOpen(false)}
                    onAddDetail={() => {
                        setIsHelpOpen(false);
                        window.dispatchEvent(new CustomEvent('open-property-palette'));
                    }}
                />
                <KeyboardShortcutsHelp
                    isOpen={isShortcutsHelpOpen}
                    onClose={() => setIsShortcutsHelpOpen(false)}
                />
            </div>
        </SelectorRegistryProvider>
    );
}
