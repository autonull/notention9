import { useCallback, useEffect, useRef } from 'react';
import { Note } from '@notention/core';
import { useDebouncedSave, UseDebouncedSaveResult } from '../useDebouncedSave';
import { useSettings } from '../useSettingsContext';
import { useGardener } from '../useGardener';
import { useToast } from '../useToast';
import { suggestionOrchestrator } from '@notention/core';

const GENERATION_DEBOUNCE_MS = 2000;

export function useNotePersistence(note: Note, onSave: (note: Note) => void): UseDebouncedSaveResult<Note> {
    const { settings } = useSettings();
    const { evolveOntology } = useGardener();
    const { addToast } = useToast();
    const regenerateTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

        // Debounced suggestion regeneration on edit
        if (regenerateTimeoutRef.current) {
            clearTimeout(regenerateTimeoutRef.current);
        }
        regenerateTimeoutRef.current = setTimeout(() => {
            suggestionOrchestrator.onNoteEdited(n);
        }, GENERATION_DEBOUNCE_MS);
    }, [onSave, settings.developerMode, evolveOntology, addToast]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (regenerateTimeoutRef.current) {
                clearTimeout(regenerateTimeoutRef.current);
            }
        };
    }, []);

    return useDebouncedSave(note, handlePersist);
}
