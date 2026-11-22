import React, {useState, useEffect, useMemo} from 'react';
import {Button} from '../ui/Button';
import {useToast} from '../../hooks/useToast';
import {useSettings} from '../../hooks/useSettingsContext';
import {useNotes} from '../../hooks/useNotes';
import {
    buildExportEnvelope,
    encryptBackup,
    type EncryptedBackup,
    isBackupDue,
    calculateNextBackup,
    getAutoBackupState,
    clearAutoBackupState,
    type BackupRecord,
} from '@notention/core';
import {ArrowDownIcon, BellIcon, CalendarIcon, LockIcon, TrashIcon, HistoryIcon} from '../ui/icons';
import {formatDistanceToNow, parseISO, isPast} from 'date-fns';

interface AutoBackupSectionProps {
    onBackupDue?: () => void;
}

export function AutoBackupSection({onBackupDue}: AutoBackupSectionProps) {
    const {settings, setSettings} = useSettings();
    const {notes} = useNotes();
    const {addToast} = useToast();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);

    const autoBackup = settings.autoBackup ?? {
        enabled: false,
        frequency: 'disabled' as const,
        encrypt: true,
        rotationCount: 7,
    };

    const updateAutoBackup = (updates: Partial<typeof autoBackup>) => {
        setSettings(s => ({
            ...s,
            autoBackup: {
                ...autoBackup,
                ...updates,
            },
        }));
    };

    const nextBackupAt = useMemo(() => calculateNextBackup(settings), [settings.autoBackup]);
    const isDue = useMemo(() => isBackupDue(settings), [settings.autoBackup]);

    useEffect(() => {
        const state = getAutoBackupState();
        setBackupHistory(state.history);
    }, []);

    useEffect(() => {
        if (isDue && autoBackup.enabled) {
            onBackupDue?.();
        }
    }, [isDue, autoBackup.enabled, onBackupDue]);

    const performBackup = async (manual = false) => {
        if (!notes.length) {
            addToast('No notes to back up', 'warning');
            return;
        }

        setIsBackingUp(true);
        try {
            let backupPassphrase = autoBackup.encrypt ? autoBackup.passphrase : undefined;

            if (autoBackup.encrypt && !backupPassphrase && manual) {
                setShowPassphrase(true);
                return;
            }

            if (autoBackup.encrypt && !backupPassphrase && !manual) {
                addToast('Encrypted backup requires a passphrase. Please configure one.', 'error');
                return;
            }

            const exportData = buildExportEnvelope(notes, settings);
            let backupData: any = exportData;
            let fileName = `notention-backup-${new Date().toISOString().slice(0, 10)}.json`;

            if (autoBackup.encrypt && backupPassphrase) {
                const encrypted = await encryptBackup(exportData, backupPassphrase);
                backupData = encrypted;
                fileName = `notention-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            const now = new Date().toISOString();
            const nextBackup = calculateNextBackup({...settings, autoBackup: {...autoBackup, lastBackupAt: now}});
            updateAutoBackup({
                lastBackupAt: now,
                nextBackupAt: nextBackup?.toISOString(),
            });

            if (showPassphrase) setShowPassphrase(false);
            setPassphrase('');

            const state = getAutoBackupState();
            setBackupHistory(state.history);

            addToast(manual ? 'Backup downloaded successfully' : 'Auto-backup downloaded successfully', 'success');
        } catch (err) {
            addToast('Backup failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handlePassphraseConfirm = () => {
        updateAutoBackup({passphrase});
        setShowPassphrase(false);
        performBackup(true);
    };

    const formatBackupDate = (timestamp: string) => {
        try {
            return formatDistanceToNow(parseISO(timestamp), {addSuffix: true});
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="border-t border-[var(--app-line)] pt-6">
            <h3 className="text-lg font-semibold text-[var(--app-text)] mb-4 flex items-center gap-2">
                <BellIcon className="h-5 w-5 text-blue-400"/>
                Auto-Backup
            </h3>

            <div className="space-y-4">
                {/* Enable toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoBackup.enabled}
                        onChange={(e) => updateAutoBackup({enabled: e.target.checked})}
                        className="w-4 h-4 text-blue-500 border-[var(--app-line-strong)] rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-[var(--app-text-secondary)]">Enable automatic backup reminders</span>
                </label>

                {autoBackup.enabled && (
                    <>
                        {/* Frequency */}
                        <div className="pl-7">
                            <label className="block text-sm text-[var(--app-muted)] mb-1">Backup frequency</label>
                            <select
                                value={autoBackup.frequency}
                                onChange={(e) => updateAutoBackup({frequency: e.target.value as any})}
                                className="w-full md:w-48 bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:border-blue-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </div>

                        {/* Encryption */}
                        <div className="pl-7">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoBackup.encrypt}
                                    onChange={(e) => updateAutoBackup({encrypt: e.target.checked})}
                                    className="w-4 h-4 text-blue-500 border-[var(--app-line-strong)] rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-[var(--app-text-secondary)]">Encrypt backups (recommended)</span>
                                <LockIcon className="h-4 w-4 text-[var(--app-muted)]"/>
                            </label>

                            {autoBackup.encrypt && (
                                <div className="pl-7 mt-2 space-y-2">
                                    <label className="block text-sm text-[var(--app-muted)] mb-1">Passphrase</label>
                                    <div className="flex gap-2">
                                        <input
                                            type={showPassphrase ? 'text' : 'password'}
                                            value={passphrase}
                                            onChange={(e) => setPassphrase(e.target.value)}
                                            placeholder="Enter passphrase for encryption"
                                            className="flex-1 bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:border-blue-500"
                                        />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setShowPassphrase(!showPassphrase)}
                                        >
                                            {showPassphrase ? 'Hide' : 'Show'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[var(--app-muted)]">
                                        This passphrase will be stored locally and used to encrypt automatic backups.
                                        Keep it safe - without it, backups cannot be restored.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rotation count */}
                        <div className="pl-7">
                            <label className="block text-sm text-[var(--app-muted)] mb-1">
                                Rotation count: {autoBackup.rotationCount} backups
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                value={autoBackup.rotationCount}
                                onChange={(e) => updateAutoBackup({rotationCount: parseInt(e.target.value)})}
                                className="w-full md:w-64 h-2 bg-neutral-700 rounded-lg appearance-none accent-blue-500"
                            />
                            <p className="text-xs text-[var(--app-muted)] mt-1">
                                Old backups beyond this count will be purged on next backup.
                            </p>
                        </div>

                        {/* Status */}
                        <div className="pl-7 bg-[var(--app-raised)] rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <CalendarIcon className="h-4 w-4 text-[var(--app-muted)]"/>
                                <span className="text-[var(--app-text-secondary)]">
                                    {autoBackup.lastBackupAt
                                        ? `Last backup: ${formatDistanceToNow(parseISO(autoBackup.lastBackupAt), {addSuffix: true})}`
                                        : 'No backup yet'}
                                </span>
                            </div>
                            {nextBackupAt && (
                                <div className="flex items-center gap-2 text-sm">
                                    <BellIcon className={`h-4 w-4 ${isDue ? 'text-amber-400' : 'text-[var(--app-muted)]'}`}/>
                                    <span className={isDue ? 'text-amber-300' : 'text-[var(--app-text-secondary)]'}>
                                        {isDue
                                            ? `Backup due! (was due ${formatDistanceToNow(nextBackupAt, {addSuffix: true})})`
                                            : `Next backup: ${formatDistanceToNow(nextBackupAt, {addSuffix: true})}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Backup History */}
                        {backupHistory.length > 0 && (
                            <div className="pl-7 bg-[var(--app-raised)] rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <HistoryIcon className="h-4 w-4 text-[var(--app-muted)]"/>
                                    <span className="text-[var(--app-text-secondary)] font-medium">Backup History ({backupHistory.length})</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {backupHistory.map((record, index) => (
                                        <div key={index} className="text-xs text-[var(--app-muted)] flex items-center gap-2 px-2 py-1 hover:bg-neutral-700/50 rounded">
                                            <span className="w-32">{formatBackupDate(record.timestamp)}</span>
                                            <span className="text-[var(--app-muted)]">|</span>
                                            <span>{record.noteCount} notes</span>
                                            <span className="text-[var(--app-muted)]">|</span>
                                            <span>{record.encrypted ? '🔒 Encrypted' : '📄 Plain'}</span>
                                            <span className="text-[var(--app-muted)]">|</span>
                                            <span>{(record.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pl-7 flex flex-wrap gap-2">
                            <Button
                                variant="primary"
                                icon={ArrowDownIcon}
                                onClick={() => performBackup(true)}
                                disabled={isBackingUp}
                            >
                                {isBackingUp ? 'Backing up...' : 'Backup Now'}
                            </Button>
                            {autoBackup.lastBackupAt && (
                                <Button
                                    variant="secondary"
                                    icon={TrashIcon}
                                    onClick={() => {
                                        updateAutoBackup({lastBackupAt: undefined, nextBackupAt: undefined});
                                        clearAutoBackupState();
                                        setBackupHistory([]);
                                        addToast('Backup history cleared', 'info');
                                    }}
                                >
                                    Clear History
                                </Button>
                            )}
                        </div>

                        {isDue && (
                            <div className="pl-7 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
                                <p className="text-sm text-amber-300 flex items-center gap-2">
                                    <BellIcon className="h-4 w-4"/>
                                    <strong>Backup is due!</strong> Click "Backup Now" to download your encrypted backup.
                                </p>
                            </div>
                        )}

                        {showPassphrase && (
                            <div className="pl-7 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                                <p className="text-sm text-blue-300 mb-2">Enter passphrase to proceed with backup:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        placeholder="Passphrase"
                                        className="flex-1 bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:border-blue-500"
                                        onKeyDown={(e) => e.key === 'Enter' && handlePassphraseConfirm()}
                                    />
                                    <Button variant="primary" size="sm" onClick={handlePassphraseConfirm}>
                                        Confirm
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setShowPassphrase(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <p className="text-xs text-[var(--app-muted)] mt-4">
                Backups are downloaded to your device - browsers cannot write files automatically.
                You'll get a notification when a backup is due. Encrypted backups require a passphrase
                that is stored locally. To restore, use the Import JSON button above.
            </p>
        </div>
    );
}