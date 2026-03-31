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

    // 1. Determine Desired State from Notes (Last one wins)
    const desiredState: Partial<AppSettings> = {};

    // Sort oldest to newest so latest updates override earlier ones
    const sortedNotes = [...configNotes].sort((a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    for (const note of sortedNotes) {
        for (const prop of note.properties) {
            // Theme
            if (prop.key === 'theme' && prop.values.length > 0) {
                const val = prop.values[0].toLowerCase();
                if (val === 'light' || val === 'dark') {
                    desiredState.theme = val;
                }
            }
            // Developer Mode
            if (prop.key === 'developer_mode' && prop.values.length > 0) {
                desiredState.developerMode = prop.values[0].toLowerCase() === 'true';
            }
            // AI Enabled
            if (prop.key === 'ai_enabled' && prop.values.length > 0) {
                desiredState.aiEnabled = prop.values[0].toLowerCase() === 'true';
            }
        }
    }

    // 2. Compare Desired State with Current Settings
    let updates: Partial<AppSettings> = {};
    let changed = false;

    if (desiredState.theme && desiredState.theme !== currentSettings.theme) {
        updates.theme = desiredState.theme;
        changed = true;
    }
    if (desiredState.developerMode !== undefined && desiredState.developerMode !== currentSettings.developerMode) {
        updates.developerMode = desiredState.developerMode;
        changed = true;
    }
    if (desiredState.aiEnabled !== undefined && desiredState.aiEnabled !== currentSettings.aiEnabled) {
        updates.aiEnabled = desiredState.aiEnabled;
        changed = true;
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
