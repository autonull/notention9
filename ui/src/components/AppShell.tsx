import React, {useEffect, useState, useMemo, useCallback, useRef, Suspense} from 'react';
import {Header} from './layout/Header';
import {MobileNavigation} from './layout/MobileNavigation';
import {CommandPalette} from './command/CommandPalette';
import {Sidebar} from './sidebar';
import {MainView} from './MainView';
import {SelectorRegistryProvider} from './properties/SelectorRegistry';
import {KeyboardShortcutsHelp} from './ui/Primitives';
import {NoteIcon} from './ui/icons';
import {getTextFromHtml, readExportEnvelope, isEncryptedBackup, decryptBackup, type ExportEnvelope, type EncryptedBackup} from '@notention/core';
import localforage from 'localforage';
import {STORAGE_KEYS} from '../config/storageKeys';

import {useNotes} from '../hooks/useNotes';
import {useView} from '../hooks/useViewContext';
import {useUrlRouting} from '../hooks/useUrlRouting';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useCommands} from '../hooks/useCommands';
import {browserSuggestionStateStore} from '../services/suggestionStateStore';
import {suggestionOrchestrator} from '@notention/core';
import {HelpDialog} from './modals/HelpDialog';
import {ConnectivityBanner} from './layout/ConnectivityBanner';
import {DegradedModeBanner} from './layout/DegradedModeBanner';
import {useToast} from '../hooks/useToast';
import {useIsMobile} from '../hooks/useMediaQuery';
import {useSidebarState} from '../hooks/useSidebarState';
import {cn} from '../utils/ui';
import {PendingConfirmationsProvider} from '../hooks/usePendingConfirmations';
import {PendingConfirmationsModal} from './ui/PendingConfirmationsModal';
import {useDegradedMode} from '../hooks/useDegradedMode';

// Dynamic import for DevBridge - only loaded when VITE_DEV_HOOKS=true
const DevBridge = import.meta.env.VITE_DEV_HOOKS === 'true'
    ? React.lazy(() => import('../dev/DevBridge').then(m => ({ default: m.DevBridge })))
    : () => null;

export function AppShell() {
    const {getSortedFilteredNotes, loading: notesLoading} = useNotes();

    // Initialize suggestion state store once
    useMemo(() => {
        suggestionOrchestrator.setStateStore(browserSuggestionStateStore);
    }, []);
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

    const {commands} = useCommands({setIsHelpOpen});
    const {addToast} = useToast();
    const isMobile = useIsMobile();
    const {addDegradedMode, removeDegradedMode} = useDegradedMode();

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
            addDegradedMode({
                type: 'storage-full',
                message: `Could not save ${detail?.key ?? 'data'}. Storage may be full.`,
                severity: 'error',
                dismissible: true,
                action: {
                    label: 'Clear Space',
                    onClick: () => {
                        // Could open storage settings
                        removeDegradedMode('storage-full');
                    }
                }
            });
        };

        const handleStorageCorrupt = (event: Event) => {
            const detail = (event as CustomEvent<{key: string; message: string}>).detail;
            addDegradedMode({
                type: 'storage-corrupt',
                message: detail?.message ?? 'Data corruption detected. A backup has been restored.',
                severity: 'error',
                dismissible: false,
                action: {
                    label: 'Restore from Backup',
                    onClick: () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                                try {
                                    const text = await file.text();
                                    const backup = JSON.parse(text);
                                    // Dispatch event for the backup restore handler
                                    window.dispatchEvent(new CustomEvent('restore-from-backup', {detail: backup}));
                                    removeDegradedMode('storage-corrupt');
                                } catch (err) {
                                    addToast('Failed to restore backup: ' + (err instanceof Error ? err.message : String(err)), 'error');
                                }
                            }
                        };
                        input.click();
                    }
                }
            });
        };

        const handleSyncFailed = (event: Event) => {
            const detail = (event as CustomEvent<{message: string}>).detail;
            addDegradedMode({
                type: 'sync-failed',
                message: detail?.message ?? 'Background sync failed. Changes are stored locally.',
                severity: 'warning',
                dismissible: true,
                action: {
                    label: 'Retry Sync',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('retry-sync'));
                        removeDegradedMode('sync-failed');
                    }
                }
            });
        };

        const handleRestoreFromBackup = async (event: Event) => {
            const backup = (event as CustomEvent<ExportEnvelope | EncryptedBackup>).detail;
            if (!backup) {
                addToast('No backup data provided', 'error');
                return;
            }

            try {
                let envelope: ExportEnvelope;

                if (isEncryptedBackup(backup)) {
                    const passphrase = prompt('Enter passphrase to decrypt backup:');
                    if (!passphrase) return;
                    try {
                        envelope = await decryptBackup(backup, passphrase);
                    } catch {
                        addToast('Decryption failed. Incorrect passphrase or corrupted backup.', 'error', 5000);
                        return;
                    }
                } else {
                    envelope = readExportEnvelope(backup);
                }

                // Save to localforage using envelope format (will create new checksum)
                await localforage.setItem(STORAGE_KEYS.notes, envelope.notes);
                await localforage.setItem(STORAGE_KEYS.settings, envelope.settings);
                
                // Clear legacy keys to force envelope format on next load
                await Promise.all([
                    localforage.removeItem(STORAGE_KEYS.envelope),
                    localforage.removeItem(STORAGE_KEYS.schemaVersion),
                    localforage.removeItem(STORAGE_KEYS.sortOrder),
                    localforage.removeItem(STORAGE_KEYS.sidebarViewMode),
                    localforage.removeItem(STORAGE_KEYS.suggestions),
                ]);

                addToast('Backup restored successfully. Reloading...', 'success');
                removeDegradedMode('storage-corrupt');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                addToast('Restore failed: ' + message, 'error');
            }
        };

        const handleOpenShortcutsHelp = () => setIsShortcutsHelpOpen(true);

        window.addEventListener('storage-error', handleStorageError);
        window.addEventListener('storage-corrupt', handleStorageCorrupt);
        window.addEventListener('sync-failed', handleSyncFailed);
        window.addEventListener('restore-from-backup', handleRestoreFromBackup);
        window.addEventListener('open-shortcuts-help', handleOpenShortcutsHelp);

        return () => {
            window.removeEventListener('storage-error', handleStorageError);
            window.removeEventListener('storage-corrupt', handleStorageCorrupt);
            window.removeEventListener('sync-failed', handleSyncFailed);
            window.removeEventListener('restore-from-backup', handleRestoreFromBackup);
            window.removeEventListener('open-shortcuts-help', handleOpenShortcutsHelp);
        };
    }, [addToast, addDegradedMode, removeDegradedMode, setIsShortcutsHelpOpen]);

    useKeyboardShortcuts({
        onNewNote: () => {
            setSelectedNoteId(null);
            setActiveView('inbox');
            requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('focus-capture')));
        },
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
        onPasteToCapture: (clipboardText: string) => {
            window.dispatchEvent(new CustomEvent('paste-to-capture', {detail: {text: clipboardText}}));
        },
        onUndo: () => window.dispatchEvent(new CustomEvent('editor-undo')),
        onRedo: () => window.dispatchEvent(new CustomEvent('editor-redo')),
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
    // On mobile the sidebar is the notes list, not permanent chrome; every other view paints first.
    const hideSidebar = isMobile && !effectiveSidebarOpen;

    const mainClasses = cn(
        'flex-1 overflow-hidden pb-20 md:pb-0',
        isMobileNoteList ? 'hidden' : 'block'
    );

    // Palette items are now handled by CommandPalette using actionRegistry

    return (
        <PendingConfirmationsProvider>
            <SelectorRegistryProvider>
                <div className="flex flex-col h-screen bg-gray-950 text-gray-200" data-ready>
                    <Header onToggleSidebar={toggleSidebar}/>
                    <ConnectivityBanner/>
                    <DegradedModeBanner/>
                    <div className="flex flex-1 overflow-hidden relative">
                        <div className={hideSidebar ? 'hidden' : cn(sidebarClasses, isMobile && 'pb-20')} style={style}>
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
                            <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-gray-950"><div className="text-gray-500">Loading view…</div></div>}>
                                <MainView sortedNotes={sortedNotes}/>
                            </Suspense>
                        </main>
                    </div>
                    <MobileNavigation/>
                    <CommandPalette
                        isOpen={isPaletteOpen}
                        onClose={() => setIsPaletteOpen(false)}
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
                    {import.meta.env.VITE_DEV_HOOKS === 'true' && (
                        <Suspense fallback={null}>
                            <DevBridge/>
                        </Suspense>
                    )}
                    <PendingConfirmationsModal/>
                </div>
            </SelectorRegistryProvider>
        </PendingConfirmationsProvider>
    );
}
