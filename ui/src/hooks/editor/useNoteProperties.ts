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

    const handleContentSave = useCallback((content: string) => {
        update(prev => ({
            ...NotePipeline.updateContent(prev, content, ontology),
            priority: 1.0 // User edit promotes priority
        }));
    }, [update, ontology]);

    const handleUpdateTextFromInspector = useCallback((oldProp: Property | null, newProp: Property | null) => {
        const newContent = replacePropertyInString(dirtyNote.content, oldProp, newProp);
        if (newContent !== dirtyNote.content) {
            recordCorrection();
            handleContentSave(newContent);
        }
    }, [dirtyNote.content, handleContentSave, recordCorrection]);

    const handleUpdateProperty = useCallback((key: string, value: string) => {
        recordCorrection();
        update(prev => NotePipeline.upsertProperty(prev, key, value, ontology));
    }, [update, ontology, recordCorrection]);

    const handleUpdateLocation = useCallback((latlng: string) => {
        recordCorrection();
        handleUpdateProperty('location', latlng);
    }, [handleUpdateProperty, recordCorrection]);

    return {
        handleContentSave,
        handleUpdateTextFromInspector,
        handleUpdateProperty,
        handleUpdateLocation
    };
}
