import React, {useEffect, useState, Suspense} from 'react';
import localforage from 'localforage';
import {decryptBackup, isEncryptedBackup, readExportEnvelope, type EncryptedBackup, type ExportEnvelope} from '@notention/core';

import {Header} from './layout/Header';
import {CaptureComposer} from './capture/CaptureComposer';
import {CommandPalette} from './command/CommandPalette';
import {MainView} from './MainView';
import {SelectorRegistryProvider} from './properties/SelectorRegistry';
import {KeyboardShortcutsHelp} from './ui/Primitives';
import {STORAGE_KEYS} from '../config/storageKeys';

import {useNotes} from '../hooks/useNotes';
import {useView} from '../hooks/useViewContext';
import {useUrlRouting} from '../hooks/useUrlRouting';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useSuggestionsCompositionRoot} from '../services/suggestions';
import {HelpDialog} from './modals/HelpDialog';
import {ConnectivityBanner} from './layout/ConnectivityBanner';
import {DegradedModeBanner} from './layout/DegradedModeBanner';
import {useToast} from '../hooks/useToast';
import {PendingConfirmationsProvider} from '../hooks/usePendingConfirmations';
import {PendingConfirmationsModal} from './ui/PendingConfirmationsModal';
import {useDegradedMode} from '../hooks/useDegradedMode';

const DevBridge = import.meta.env.VITE_DEV_HOOKS === 'true'
    ? React.lazy(() => import('../dev/DevBridge').then(m => ({ default: m.DevBridge })))
    : () => null;

export function AppShell() {
    const {getSortedFilteredNotes, loading: notesLoading} = useNotes();

    useSuggestionsCompositionRoot();
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
        setIsHelpOpen,
        isCaptureComposerOpen,
        setIsCaptureComposerOpen,
    } = useView();

    const sortedNotes = getSortedFilteredNotes(searchTerm, sortOrder, false, userLocation);

    useUrlRouting();

    const {addToast} = useToast();
    const {addDegradedMode, removeDegradedMode} = useDegradedMode();
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
                    onClick: () => removeDegradedMode('storage-full'),
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

                await localforage.setItem(STORAGE_KEYS.notes, envelope.notes);
                await localforage.setItem(STORAGE_KEYS.settings, envelope.settings);

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
    }, [addToast, addDegradedMode, removeDegradedMode]);

    useKeyboardShortcuts({
        onNewNote: () => setIsCaptureComposerOpen(true),
        onSearch: () => {
            window.dispatchEvent(new CustomEvent('open-search'));
            setIsPaletteOpen(true);
        },
        onCommandPalette: () => {
            window.dispatchEvent(new CustomEvent('open-search'));
            setIsPaletteOpen(true);
        },
        onPropertyPalette: () => window.dispatchEvent(new CustomEvent('open-property-palette')),
        onSave: () => window.dispatchEvent(new CustomEvent('save-note')),
        onPasteToCapture: (clipboardText: string) => {
            window.dispatchEvent(new CustomEvent('paste-to-capture', {detail: {text: clipboardText}}));
        },
        onUndo: () => window.dispatchEvent(new CustomEvent('editor-undo')),
        onRedo: () => window.dispatchEvent(new CustomEvent('editor-redo')),
        onPreviousNote: () => {
            if (sortedNotes.length > 0 && selectedNoteId) {
                const currentIndex = sortedNotes.findIndex(note => note.id === selectedNoteId);
                if (currentIndex > 0) setSelectedNoteId(sortedNotes[currentIndex - 1].id);
            }
        },
        onNextNote: () => {
            if (sortedNotes.length > 0 && selectedNoteId) {
                const currentIndex = sortedNotes.findIndex(note => note.id === selectedNoteId);
                if (currentIndex < sortedNotes.length - 1) setSelectedNoteId(sortedNotes[currentIndex + 1].id);
            }
        },
        onBackToList: () => setSelectedNoteId(null),
        onEscape: () => {
            setIsPaletteOpen(false);
            setIsHelpOpen(false);
            setIsShortcutsHelpOpen(false);
            setIsCaptureComposerOpen(false);
        },
        onShortcutsHelp: () => setIsShortcutsHelpOpen(true),
        onNavigateView: (view) => {
            setActiveView(view);
            setIsPaletteOpen(false);
        },
    });

    return (
        <PendingConfirmationsProvider>
            <SelectorRegistryProvider>
                <div className="flex h-dvh flex-col bg-neutral-950 text-neutral-200" data-ready>
                    <Header/>
                    <ConnectivityBanner/>
                    <DegradedModeBanner/>
                    <main id="main-content" className="relative flex-1 overflow-hidden" tabIndex={-1}>
                        <Suspense fallback={<div className="flex h-full items-center justify-center text-neutral-400">Loading…</div>}>
                            <MainView sortedNotes={sortedNotes} loading={notesLoading}/>
                        </Suspense>
                    </main>
                    <CaptureComposer isOpen={isCaptureComposerOpen} onClose={() => setIsCaptureComposerOpen(false)}/>
                    <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)}/>
                    <HelpDialog
                        isOpen={isHelpOpen}
                        onClose={() => setIsHelpOpen(false)}
                        onAddDetail={() => {
                            setIsHelpOpen(false);
                            window.dispatchEvent(new CustomEvent('open-property-palette'));
                        }}
                    />
                    <KeyboardShortcutsHelp isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)}/>
                    {import.meta.env.VITE_DEV_HOOKS === 'true' && (
                        <Suspense fallback={null}><DevBridge/></Suspense>
                    )}
                    <PendingConfirmationsModal/>
                </div>
            </SelectorRegistryProvider>
        </PendingConfirmationsProvider>
    );
}
