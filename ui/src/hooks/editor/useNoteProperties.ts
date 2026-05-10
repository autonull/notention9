import { useCallback, useMemo } from 'react';
import {
    Note,
    Property,
    PropertyExtractor,
    parseProperties,
    getTextFromHtml,
    NotePipeline,
    OntologyNode,
    replacePropertyInString
} from '@notention/core';

export function useNoteProperties(
    dirtyNote: Note,
    setDirtyNote: React.Dispatch<React.SetStateAction<Note>>,
    ontology?: OntologyNode[]
) {
    const propertyExtractor = useMemo(() => new PropertyExtractor(ontology), [ontology]);

    const handleContentSave = useCallback((content: string) => {
        setDirtyNote(prev => {
            const updated = NotePipeline.updateContent(prev, content, ontology);
            return {
                ...updated,
                priority: 1.0 // User edit promotes priority
            };
        });
    }, [setDirtyNote, ontology]);

    const handleUpdateTextFromInspector = useCallback((oldProp: Property | null, newProp: Property | null) => {
        const newContent = replacePropertyInString(dirtyNote.content, oldProp, newProp);
        if (newContent !== dirtyNote.content) {
            handleContentSave(newContent);
        }
    }, [dirtyNote.content, handleContentSave]);

    const handleUpdateProperty = useCallback((key: string, value: string) => {
        setDirtyNote(prev => {
            const updated = NotePipeline.upsertProperty(prev, key, value, ontology);
            return updated;
        });
    }, [setDirtyNote, ontology]);

    const handleUpdateLocation = useCallback((latlng: string) => {
        handleUpdateProperty('location', latlng);
    }, [handleUpdateProperty]);

    return {
        handleContentSave,
        handleUpdateTextFromInspector,
        handleUpdateProperty,
        handleUpdateLocation
    };
}
