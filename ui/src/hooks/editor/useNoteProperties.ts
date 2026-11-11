import { useCallback, useMemo } from 'react';
import {
    Note,
    Property,
    PropertyExtractor,
    NotePipeline,
    OntologyNode,
    replacePropertyInString
} from '@notention/core';
import { createUpdateHandler } from '../../utils/ui';
import { useFrictionRecorder } from '../../hooks/useFrictionRecorder';

export function useNoteProperties(
    dirtyNote: Note,
    setDirtyNote: React.Dispatch<React.SetStateAction<Note>>,
    ontology?: OntologyNode[]
) {
    const propertyExtractor = useMemo(() => new PropertyExtractor(ontology), [ontology]);
    const update = useMemo(() => createUpdateHandler(setDirtyNote), [setDirtyNote]);

    // Friction tracking for corrections
    const { recordCorrection } = useFrictionRecorder('capture', 'editor');

    const handleContentSave = useCallback(async (content: string) => {
        const updated = await NotePipeline.updateContent(dirtyNote, content, ontology);
        setDirtyNote({
            ...updated,
            priority: 1.0 // User edit promotes priority
        });
    }, [setDirtyNote, ontology]);

    const handleUpdateTextFromInspector = useCallback(async (oldProp: Property | null, newProp: Property | null) => {
        const newContent = replacePropertyInString(dirtyNote.content, oldProp, newProp);
        if (newContent !== dirtyNote.content) {
            recordCorrection();
            await handleContentSave(newContent);
        }
    }, [dirtyNote.content, handleContentSave, recordCorrection]);

    const handleUpdateProperty = useCallback(async (key: string, value: string) => {
        recordCorrection();
        const updated = await NotePipeline.upsertProperty(dirtyNote, key, value, ontology);
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
