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
        // 1. Parse explicit properties from content (bracket syntax)
        const explicitProperties = parseProperties(content, ontology);

        // 2. Extract implicit properties from plain text
        const plainText = getTextFromHtml(content);
        const implicitProperties = propertyExtractor.extractFromText(plainText);

        // 3. Merge properties: Explicit overrides Implicit
        const explicitKeys = new Set(explicitProperties.map(p => p.key));
        const newImplicitProps = implicitProperties.filter(p => !explicitKeys.has(p.key));

        const properties = [...explicitProperties, ...newImplicitProps];

        setDirtyNote(prev => ({
            ...prev,
            content,
            properties,
            priority: 1.0 // User edit promotes priority
        }));
    }, [setDirtyNote, propertyExtractor, ontology]);

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
