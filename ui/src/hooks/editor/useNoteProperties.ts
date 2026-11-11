import { useCallback, useRef } from 'react';
import {
    Note,
    Property,
    NotePipeline,
    OntologyNode,
    replacePropertyInContent
} from '@notention/core';
import { useFrictionRecorder } from '../../hooks/useFrictionRecorder';

export function useNoteProperties(
    dirtyNote: Note,
    setDirtyNote: React.Dispatch<React.SetStateAction<Note>>,
    ontology?: OntologyNode[]
) {
    // The note changes on every keystroke; callbacks must read the latest one.
    const noteRef = useRef(dirtyNote);
    noteRef.current = dirtyNote;

    // Friction tracking for corrections
    const { recordCorrection } = useFrictionRecorder('capture', 'editor');

    const handleContentSave = useCallback(async (content: string) => {
        const updated = await NotePipeline.updateContent(noteRef.current, content, ontology);
        setDirtyNote({
            ...updated,
            priority: 1.0 // User edit promotes priority
        });
    }, [setDirtyNote, ontology]);

    const handleUpdateTextFromInspector = useCallback(async (oldProp: Property | null, newProp: Property | null) => {
        const note = noteRef.current;

        if (!newProp) {
            if (!oldProp) return;
            recordCorrection();
            const updated = await NotePipeline.removeProperty(note, oldProp.key, ontology);
            setDirtyNote({...updated, priority: 1.0});
            return;
        }

        const newContent = replacePropertyInContent(note.content, oldProp, newProp);
        if (newContent !== note.content) {
            recordCorrection();
            await handleContentSave(newContent);
        }
    }, [handleContentSave, recordCorrection, setDirtyNote, ontology]);

    const handleUpdateProperty = useCallback(async (key: string, value: string) => {
        recordCorrection();
        const updated = await NotePipeline.upsertProperty(noteRef.current, key, value, ontology);
        setDirtyNote(updated);
    }, [setDirtyNote, ontology, recordCorrection]);

    const handleUpdateLocation = useCallback(async (latlng: string) => {
        recordCorrection();
        await handleUpdateProperty('location', latlng);
    }, [handleUpdateProperty, recordCorrection]);

    return {
        handleContentSave,
        handleUpdateTextFromInspector,
        handleUpdateProperty,
        handleUpdateLocation
    };
}
