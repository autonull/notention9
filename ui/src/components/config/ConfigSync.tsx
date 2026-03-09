import React, {useEffect} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {mergeConfigs, parseConfigFromNote} from '@notention/core';

export function ConfigSync() {
    const {notes} = useNotes();
    const {setSettings} = useSettings();

    useEffect(() => {
        // Find the active config note
        const configNote = notes.find(n => n.tags.includes('@config:active'));

        if (configNote) {
            const configUpdates = parseConfigFromNote(configNote);

            setSettings(prev => {
                // Merge and check if changed to avoid loop?
                // mergeConfigs returns a new object.
                // We should probably check if meaningful changes occurred to avoid re-renders or loops.
                // For now, let's assume setSettings stability or React's diffing.
                // Actually, if we create a new object every time, we might trigger effects.
                // But this effect runs on `notes` change.
                // So if notes change, we re-evaluate config.

                // One optimization: check if JSON.stringify(currentSubset) === JSON.stringify(newSubset)

                return mergeConfigs(prev, configUpdates);
            });
        }
    }, [notes, setSettings]);

    return null;
}
