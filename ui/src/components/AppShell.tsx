import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {Header} from './layout/Header';
import {MobileNavigation} from './layout/MobileNavigation';
import {EnhancedCommandPalette} from './ui/EnhancedCommandPalette';
import {Sidebar} from './sidebar';
import {MainView} from './MainView';
import {SelectorRegistryProvider} from './properties/SelectorRegistry';
import {KeyboardShortcutsHelp} from './common/KeyboardShortcutsHelp';
import {ContextualHint} from './ui/ContextualHint';
import {PlusIcon, NoteIcon} from './common/icons';

import {useNotes} from '../hooks/useNotes';
import {useView} from '../hooks/useViewContext';
import {useUrlRouting} from '../hooks/useUrlRouting';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useCommands} from '../hooks/useCommands';
import {HelpDialog} from './modals/HelpDialog';
import {ConnectivityBanner} from './layout/ConnectivityBanner';
import {useToast} from '../hooks/useToast';
import {cn} from '../utils/ui';

const SIDEBAR_WIDTH = 320;
const SIDEBAR_COLLAPSED_WIDTH = 48;

export function AppShell() {
    const {addNote, getSortedFilteredNotes, loading: notesLoading} = useNotes();
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
    const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef({x: 0, width: SIDEBAR_WIDTH});
    const mainContentRef = useRef<HTMLMainElement>(null);

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

    const handleCreateNote = useCallback((title: string) => {
        const newNote = addNote({title});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleResizeMoveRef = useRef<(e: MouseEvent) => void>();
    const handleResizeEndRef = useRef<() => void>();

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {x: e.clientX, width: sidebarWidth};
        document.addEventListener('mousemove', handleResizeMoveRef.current!);
        document.addEventListener('mouseup', handleResizeEndRef.current!);
    }, [sidebarWidth]);

    handleResizeMoveRef.current = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = Math.min(Math.max(resizeStartRef.current.width - (e.clientX - resizeStartRef.current.x), SIDEBAR_COLLAPSED_WIDTH), 600);
        setSidebarWidth(newWidth);
    }, [isResizing]);

    handleResizeEndRef.current = useCallback(() => {
        if (!isResizing) return;
        setIsResizing(false);
        document.removeEventListener('mousemove', handleResizeMoveRef.current!);
        document.removeEventListener('mouseup', handleResizeEndRef.current!);
    }, [isResizing]);

    const toggleSidebar = useCallback(() => {
        if (window.innerWidth < 768) {
            setMobileSidebarOpen(!mobileSidebarOpen);
        } else {
            if (isSidebarOpen && sidebarWidth > SIDEBAR_COLLAPSED_WIDTH) {
                setSidebarWidth(SIDEBAR_COLLAPSED_WIDTH);
                setIsSidebarOpen(false);
            } else {
                setSidebarWidth(SIDEBAR_WIDTH);
                setIsSidebarOpen(true);
            }
        }
    }, [isSidebarOpen, sidebarWidth, mobileSidebarOpen, setIsSidebarOpen, setMobileSidebarOpen]);

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
        onToggleSidebar: toggleSidebar,
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
    const effectiveSidebarOpen = isMobile ? mobileSidebarOpen : isSidebarOpen;
    const effectiveSidebarWidth = isMobile ? (mobileSidebarOpen ? SIDEBAR_WIDTH : 0) : (isSidebarOpen ? sidebarWidth : 0);

    const sidebarClasses = cn(
        'flex-shrink-0 bg-gray-900 border-r border-gray-700/50 transition-all duration-300 ease-in-out',
        isMobileNoteList ? 'w-full block' : 'hidden md:block',
        `w-[${effectiveSidebarWidth}px]`,
        effectiveSidebarWidth === 0 && 'border-r-0 overflow-hidden',
        isResizing && 'select-none'
    );

    const mainClasses = cn(
        'flex-1 overflow-hidden pb-20 md:pb-0',
        isMobileNoteList ? 'hidden md:block' : 'block'
    );

    return (
        <SelectorRegistryProvider>
            <div className="flex flex-col h-screen bg-gray-950 text-gray-200" data-ready>
                <a
                    href="#main-content"
                    className="skip-link"
                >
                    Skip to main content
                </a>
                <Header onNewNote={handleNewNote}/>
                <ConnectivityBanner/>
                <div className="flex flex-1 overflow-hidden relative">
                    <div className={sidebarClasses} style={{width: `${effectiveSidebarWidth}px`}}>
                        <Sidebar
                            sortedNotes={sortedNotes}
                            onToggleSidebar={toggleSidebar}
                            isSidebarOpen={effectiveSidebarOpen}
                            isLoading={notesLoading}
                            sidebarWidth={sidebarWidth}
                            isCollapsed={!isSidebarOpen && !isMobile}
                        />
                    </div>

                    {!isMobile && isSidebarOpen && sidebarWidth > SIDEBAR_COLLAPSED_WIDTH && (
                        <div
                            className="absolute top-16 bottom-0 w-1 cursor-col-resize z-10 hover:bg-blue-500/30 transition-colors"
                            style={{left: `${sidebarWidth}px`}}
                            onMouseDown={handleResizeStart}
                            aria-label="Resize sidebar"
                            role="separator"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    const newWidth = Math.min(Math.max(sidebarWidth + (e.key === 'ArrowRight' ? 20 : -20), SIDEBAR_COLLAPSED_WIDTH), 600);
                                    setSidebarWidth(newWidth);
                                }
                            }}
                        />
                    )}

                    {isMobile && mobileSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setMobileSidebarOpen(false)}
                            aria-hidden="true"
                        />
                    )}

                    <main id="main-content" ref={mainContentRef} className={mainClasses}>
                        <MainView sortedNotes={sortedNotes}/>
                    </main>
                </div>
                <MobileNavigation/>
                <EnhancedCommandPalette
                    isOpen={isPaletteOpen}
                    onClose={() => setIsPaletteOpen(false)}
                    items={useMemo(() => [
                        ...commands.map((cmd) => ({
                            id: `cmd-${cmd.label}`,
                            label: cmd.label,
                            icon: cmd.icon,
                            action: cmd.action,
                            category: 'Navigation',
                            shortcut: cmd.shortcut,
                            keywords: cmd.label.toLowerCase().split(' '),
                        })),
                        ...sortedNotes.map((note) => ({
                            id: note.id,
                            label: note.title || 'Untitled',
                            description: note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 60) : '',
                            icon: <NoteIcon className="h-5 w-5"/>,
                            action: () => {
                                setSelectedNoteId(note.id);
                                setActiveView('notes');
                            },
                            category: 'Notes',
                            keywords: [note.title.toLowerCase(), ...note.tags.map(t => `#${t.toLowerCase()}`)],
                        })),
                        {
                            id: 'create-note',
                            label: 'Create new note',
                            description: 'Create a new note',
                            icon: <PlusIcon className="h-5 w-5"/>,
                            action: () => handleCreateNote('New Note'),
                            category: 'Actions',
                            shortcut: 'Ctrl+N',
                            keywords: ['new', 'create', 'note', 'add'],
                        },
                    ], [commands, sortedNotes, handleCreateNote, setActiveView, setSelectedNoteId])}
                    placeholder="Type a command or search notes... (#tag, key:value)"
                    title="Command Palette"
                    showShortcuts={true}
                    showRecent={true}
                    fuzzySearch={true}
                />
                <ContextualHint compact persistent position="bottom-left"/>
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
