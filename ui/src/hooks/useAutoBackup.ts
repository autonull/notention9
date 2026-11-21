import {useEffect} from 'react';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';
import {useNotes} from './useNotes';
import {
    createAutoBackupScheduler,
    triggerBackupOnChange,
    isBackupDue,
    calculateNextBackup,
    type AppSettings,
    type Note,
} from '@notention/core';

/**
 * Hook to check and notify when auto-backup is due.
 * Should be used in a top-level component that's always mounted (e.g., App).
 * Starts a periodic scheduler that checks every hour and triggers auto-download when due.
 */
export function useAutoBackup() {
    const {settings, setSettings} = useSettings();
    const {addToast} = useToast();
    const {notes} = useNotes();

    useEffect(() => {
        const autoBackup = settings.autoBackup;
        if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return;

        const stopScheduler = createAutoBackupScheduler(
            () => notes,
            () => settings,
            (updates) => setSettings(s => ({...s, ...updates})),
            (blob, filename) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            },
            (message, type) => addToast(message, type)
        );

        return stopScheduler;
    }, [settings.autoBackup?.enabled, settings.autoBackup?.frequency, notes.length, settings, setSettings, addToast]);
}

/**
 * Hook to trigger auto-backup on note changes.
 * Call this when notes are created, updated, or deleted.
 */
export function useAutoBackupOnChange() {
    const {settings, setSettings} = useSettings();
    const {addToast} = useToast();
    const {notes} = useNotes();

    return () => {
        const autoBackup = settings.autoBackup;
        if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return;

        triggerBackupOnChange(
            () => notes,
            () => settings,
            (updates) => setSettings(s => ({...s, ...updates})),
            (blob, filename) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            },
            (message, type) => addToast(message, type)
        );
    };
}

export {isBackupDue, calculateNextBackup};
export type {AppSettings, Note};