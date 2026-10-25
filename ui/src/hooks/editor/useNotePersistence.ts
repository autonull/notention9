import { useCallback } from 'react';
import { Note } from '@notention/core';
import { useDebouncedSave, UseDebouncedSaveResult } from '../useDebouncedSave';
import { useSettings } from '../useSettingsContext';
import { useGardener } from '../useGardener';
import { useToast } from '../useToast';

export function useNotePersistence(note: Note, onSave: (note: Note) => void): UseDebouncedSaveResult<Note> {
    const { settings } = useSettings();
    const { evolveOntology } = useGardener();
    const { addToast } = useToast();

    const handlePersist = useCallback((n: Note) => {
        onSave(n);
        if (settings.developerMode) {
            evolveOntology([n]).then(attrs => {
                if (attrs.length > 0) {
                    const keys = attrs.map(a => a.key).join(', ');
                    addToast(`Ontology evolved! You introduced: ${keys}`, 'info');
                }
            });
        }
    }, [onSave, settings.developerMode, evolveOntology, addToast]);

    return useDebouncedSave(note, handlePersist);
}
