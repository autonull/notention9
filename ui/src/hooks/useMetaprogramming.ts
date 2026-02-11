import {useEffect} from 'react';
import {Note, AppSettings} from '@notention/core';
import {useNotes} from './useNotes';
import {useSettings} from './useSettingsContext';

/**
 * Parses config notes and returns updated settings if changes are needed
 */
export function getUpdatedSettings(notes: Note[], currentSettings: AppSettings): Partial<AppSettings> | null {
    const configNotes = notes.filter(n => n.tags.includes('#config') || n.tags.includes('#system'));
    if (configNotes.length === 0) return null;

    let updates: Partial<AppSettings> = {};
    let changed = false;

    // Iterate through all config notes
    // Last note wins if multiple define the same setting (based on sort order, usually creation date or update)
    // We assume notes are sorted by update time descending, so we iterate in reverse to apply oldest first?
    // Actually, iterate in normal order (newest first usually) means newest wins.
    // Let's just iterate and let the last one win.

    // Reverse to apply oldest first, so newest (last in array if sorted by date desc?)
    // Actually notes from useNotes are usually sorted by updatedAt desc.
    // So the first note in the array is the latest.
    // We should process in reverse order so the latest one overrides previous ones.
    const sortedNotes = [...configNotes].reverse();

    for (const note of sortedNotes) {
        for (const prop of note.properties) {
            // Theme
            if (prop.key === 'theme' && prop.values.length > 0) {
                const val = prop.values[0].toLowerCase();
                if ((val === 'light' || val === 'dark') && currentSettings.theme !== val) {
                    updates.theme = val;
                    changed = true;
                }
            }
            // Developer Mode
            if (prop.key === 'developer_mode' && prop.values.length > 0) {
                const val = prop.values[0].toLowerCase() === 'true';
                if (currentSettings.developerMode !== val) {
                    updates.developerMode = val;
                    changed = true;
                }
            }
            // AI Enabled
            if (prop.key === 'ai_enabled' && prop.values.length > 0) {
                const val = prop.values[0].toLowerCase() === 'true';
                if (currentSettings.aiEnabled !== val) {
                    updates.aiEnabled = val;
                    changed = true;
                }
            }
        }
    }

    return changed ? updates : null;
}

export function useMetaprogramming() {
    const {notes} = useNotes();
    const {settings, setSettings} = useSettings();

    useEffect(() => {
        if (!notes || !settings) return;

        const updates = getUpdatedSettings(notes, settings);
        if (updates) {
            setSettings(prev => ({...prev, ...updates}));
        }
    }, [notes, settings, setSettings]);
}
