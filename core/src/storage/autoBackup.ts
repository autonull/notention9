import type {AppSettings, Note} from '../types/index.js';
import {buildExportEnvelope} from '../export/exportEnvelope.js';
import {encryptBackup, type EncryptedBackup} from '../export/backupEncryption.js';

export interface BackupRecord {
    timestamp: string;
    noteCount: number;
    encrypted: boolean;
    size: number;
}

export interface AutoBackupState {
    history: BackupRecord[];
    lastCheckAt?: string;
}

const STORAGE_KEY = 'notention:auto-backup-state';

function loadState(): AutoBackupState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
    }
    return {history: []};
}

function saveState(state: AutoBackupState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
    }
}

export function getAutoBackupState(): AutoBackupState {
    return loadState();
}

export function clearAutoBackupState(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function recordBackup(record: BackupRecord, rotationCount: number): void {
    const state = loadState();
    state.history.unshift(record);
    if (state.history.length > rotationCount) {
        state.history = state.history.slice(0, rotationCount);
    }
    saveState(state);
}

export function isBackupDue(settings: AppSettings): boolean {
    const autoBackup = settings.autoBackup;
    if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return false;
    if (!autoBackup.lastBackupAt) return true;

    const lastBackup = new Date(autoBackup.lastBackupAt);
    let nextBackup: Date;

    switch (autoBackup.frequency) {
        case 'daily':
            nextBackup = new Date(lastBackup.getTime() + 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            nextBackup = new Date(lastBackup.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            nextBackup = new Date(lastBackup.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            return false;
    }

    return new Date() > nextBackup;
}

export function calculateNextBackup(settings: AppSettings): Date | null {
    const autoBackup = settings.autoBackup;
    if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return null;
    if (!autoBackup.lastBackupAt) return new Date();

    const lastBackup = new Date(autoBackup.lastBackupAt);
    switch (autoBackup.frequency) {
        case 'daily':
            return new Date(lastBackup.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
            return new Date(lastBackup.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(lastBackup.getTime() + 30 * 24 * 60 * 60 * 1000);
        default:
            return null;
    }
}

export async function performAutoBackup(
    notes: Note[],
    settings: AppSettings,
    onDownload: (blob: Blob, filename: string) => void
): Promise<BackupRecord | null> {
    if (!notes.length) return null;

    const autoBackup = settings.autoBackup;
    if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return null;

    let backupPassphrase = autoBackup.encrypt ? autoBackup.passphrase : undefined;
    if (autoBackup.encrypt && !backupPassphrase) {
        throw new Error('Encrypted backup requires a passphrase');
    }

    const exportData = buildExportEnvelope(notes, settings);
    let backupData: any = exportData;
    let fileName = `notention-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (autoBackup.encrypt && backupPassphrase) {
        const encrypted = await encryptBackup(exportData, backupPassphrase);
        backupData = encrypted;
        fileName = `notention-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
    }

    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], {type: 'application/json'});

    onDownload(blob, fileName);

    const record: BackupRecord = {
        timestamp: new Date().toISOString(),
        noteCount: notes.length,
        encrypted: autoBackup.encrypt,
        size: blob.size,
    };

    return record;
}

export function createAutoBackupScheduler(
    getNotes: () => Note[],
    getSettings: () => AppSettings,
    updateSettings: (updates: Partial<AppSettings>) => void,
    onDownload: (blob: Blob, filename: string) => void,
    onNotify: (message: string, type: 'info' | 'warning' | 'error') => void
): () => void {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkAndBackup = async () => {
        const settings = getSettings();
        const autoBackup = settings.autoBackup;
        if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return;

        if (isBackupDue(settings)) {
            try {
                const notes = getNotes();
                const record = await performAutoBackup(notes, settings, onDownload);
                if (record) {
                    const now = new Date().toISOString();
                    const nextBackup = calculateNextBackup(settings);
                    updateSettings({
                        autoBackup: {
                            ...autoBackup,
                            lastBackupAt: now,
                            nextBackupAt: nextBackup?.toISOString(),
                        },
                    });
                    recordBackup(record, autoBackup.rotationCount ?? 7);
                    onNotify('Auto-backup downloaded successfully', 'info');
                }
            } catch (err) {
                onNotify('Auto-backup failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
            }
        }
    };

    const start = () => {
        checkAndBackup();
        intervalId = setInterval(checkAndBackup, 60 * 60 * 1000);
    };

    const stop = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    const state = getAutoBackupState();
    if (!state.lastCheckAt || new Date(state.lastCheckAt).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        state.lastCheckAt = new Date().toISOString();
        saveState(state);
        start();
    } else {
        start();
    }

    return stop;
}

export function triggerBackupOnChange(
    getNotes: () => Note[],
    getSettings: () => AppSettings,
    updateSettings: (updates: Partial<AppSettings>) => void,
    onDownload: (blob: Blob, filename: string) => void,
    onNotify: (message: string, type: 'info' | 'warning' | 'error') => void
): void {
    const settings = getSettings();
    const autoBackup = settings.autoBackup;
    if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return;

    performAutoBackup(getNotes(), settings, onDownload)
        .then(record => {
            if (record) {
                const now = new Date().toISOString();
                const nextBackup = calculateNextBackup(settings);
                updateSettings({
                    autoBackup: {
                        ...autoBackup,
                        lastBackupAt: now,
                        nextBackupAt: nextBackup?.toISOString(),
                    },
                });
                recordBackup(record, autoBackup.rotationCount ?? 7);
                onNotify('Auto-backup downloaded successfully', 'info');
            }
        })
        .catch(err => {
            onNotify('Auto-backup failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
        });
}