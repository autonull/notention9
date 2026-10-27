import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {Header} from './layout/Header';
import {MobileNavigation} from './layout/MobileNavigation';
import {EnhancedCommandPalette} from './ui/EnhancedCommandPalette';
import {Sidebar} from './sidebar';
import {MainView} from './MainView';
import {SelectorRegistryProvider} from './properties/SelectorRegistry';
import {KeyboardShortcutsHelp} from './ui/Primitives';
import {ContextualHint} from './ui/ContextualHint';
import {NoteIcon} from './ui/icons';

import {useNotes} from '../hooks/useNotes';
import {useView} from '../hooks/useViewContext';
import {useUrlRouting} from '../hooks/useUrlRouting';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useCommands} from '../hooks/useCommands';
import {HelpDialog} from './modals/HelpDialog';
import {ConnectivityBanner} from './layout/ConnectivityBanner';
import {useToast} from '../hooks/useToast';
import {useIsMobile} from '../hooks/useMediaQuery';
import {useSidebarState} from '../hooks/useSidebarState';
import {cn} from '../utils/ui';
import {DevBridge} from '../dev/DevBridge';

export function AppShell() {
    const {getSortedFilteredNotes, loading: notesLoading} = useNotes();
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        searchTerm,
        sortOrder,
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
    const isMobile = useIsMobile();

    const {
        isOpen: isSidebarOpen,
        isCollapsed,
        effectiveWidth,
        sidebarClasses,
        style,
        handleResizeStart,
        handleResizeKeyDown,
        toggleSidebar,
    } = useSidebarState({
        isMobile,
        onToggle: () => {
            if (isMobile) {
                setSelectedNoteId(null);
                setActiveView('notes');
            }
        }
    });

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

    useKeyboardShortcuts({
        onNewNote: handleNewNote,
        onSearch: () => {
            const focusSearch = () => document.getElementById('sidebar-search-input')?.focus();
            if (isMobile && selectedNoteId) {
                setSelectedNoteId(null);
                setActiveView('notes');
                requestAnimationFrame(focusSearch);
                return;
            }
            if (activeView !== 'notes') {
                setActiveView('notes');
                requestAnimationFrame(focusSearch);
                return;
            }
            focusSearch();
        },
        onCommandPalette: () => setIsPaletteOpen(true),
        onPropertyPalette: () => {
            window.dispatchEvent(new CustomEvent('open-property-palette'));
        },
        onSave: () => window.dispatchEvent(new CustomEvent('save-note')),
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
        },
        onShortcutsHelp: () => setIsShortcutsHelpOpen(true),
        onNavigateView: (view) => {
            setActiveView(view);
            setIsPaletteOpen(false);
        },
    });

    const isMobileNoteList = isMobile && activeView === 'notes' && !selectedNoteId;
    const effectiveSidebarOpen = isMobile ? isMobileNoteList : isSidebarOpen;

    const mainClasses = cn(
        'flex-1 overflow-hidden pb-20 md:pb-0',
        isMobileNoteList ? 'hidden' : 'block'
    );

    const paletteItems = useMemo(() => [
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
            keywords: [
                note.title.toLowerCase(),
                ...note.tags.map(t => `#${t.toLowerCase()}`),
                ...note.properties.flatMap(({key, values}) => [
                    key.toLowerCase(),
                    ...values.map(value => `${key.toLowerCase()}:${value.toLowerCase()}`),
                ]),
            ],
        })),
    ], [commands, sortedNotes, setActiveView, setSelectedNoteId]);

    return (
        <SelectorRegistryProvider>
            <div className="flex flex-col h-screen bg-gray-950 text-gray-200" data-ready>
                <Header onNewNote={handleNewNote} onToggleSidebar={toggleSidebar}/>
                <ConnectivityBanner/>
                <div className="flex flex-1 overflow-hidden relative">
                    <div className={sidebarClasses} style={style}>
                        <Sidebar
                            sortedNotes={sortedNotes}
                            onToggleSidebar={toggleSidebar}
                            isSidebarOpen={effectiveSidebarOpen}
                            isLoading={notesLoading}
                            sidebarWidth={isMobile ? 320 : effectiveWidth}
                            isCollapsed={!isMobile && isCollapsed}
                        />
                    </div>

                    {!isMobile && isSidebarOpen && effectiveWidth > 48 && (
                        <div
                            className="absolute top-16 bottom-0 w-1 cursor-col-resize z-10 hover:bg-blue-500/30 transition-colors"
                            style={{left: `${effectiveWidth}px`}}
                            onMouseDown={handleResizeStart}
                            aria-label="Resize sidebar"
                            role="separator"
                            tabIndex={0}
                            onKeyDown={(e) => handleResizeKeyDown(e, effectiveWidth)}
                        />
                    )}

                    <main id="main-content" className={mainClasses} tabIndex={-1}>
                        <MainView sortedNotes={sortedNotes}/>
                    </main>
                </div>
                <MobileNavigation/>
                <EnhancedCommandPalette
                    isOpen={isPaletteOpen}
                    onClose={() => setIsPaletteOpen(false)}
                    items={paletteItems}
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
                {import.meta.env.VITE_DEV_HOOKS && <DevBridge/>}
            </div>
        </SelectorRegistryProvider>
    );
}
