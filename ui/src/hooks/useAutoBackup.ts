import {useEffect} from 'react';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';
import {addDays, addWeeks, addMonths, parseISO, isPast} from 'date-fns';

/**
 * Hook to check and notify when auto-backup is due.
 * Should be used in a top-level component that's always mounted (e.g., App).
 */
export function useAutoBackup() {
    const {settings} = useSettings();
    const {addToast} = useToast();

    useEffect(() => {
        const autoBackup = settings.autoBackup;
        if (!autoBackup?.enabled || autoBackup.frequency === 'disabled') return;
        if (!autoBackup.lastBackupAt) return;

        const lastBackup = parseISO(autoBackup.lastBackupAt);
        let nextBackup: Date;

        switch (autoBackup.frequency) {
            case 'daily': nextBackup = addDays(lastBackup, 1); break;
            case 'weekly': nextBackup = addWeeks(lastBackup, 1); break;
            case 'monthly': nextBackup = addMonths(lastBackup, 1); break;
            default: return;
        }

        if (isPast(nextBackup)) {
            addToast('Auto-backup is due! Open Settings > Data Management to download your backup.', 'warning', 10000);
        }
    }, [settings.autoBackup, addToast]);
}