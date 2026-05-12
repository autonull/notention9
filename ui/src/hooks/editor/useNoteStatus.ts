import { useCallback } from 'react';
import { Note, NOTE_STATUS, NotePipeline, OntologyNode, isNoteActive } from '@notention/core';

export function useNoteStatus(
    dirtyNote: Note,
    setDirtyNote: React.Dispatch<React.SetStateAction<Note>>,
    onSave: (note: Note) => void,
    ontology?: OntologyNode[]
) {
    const isActive = isNoteActive(dirtyNote);

    const handleToggleActive = useCallback(() => {
        setDirtyNote((prev) => {
            const updated = NotePipeline.toggleStatus(prev, NOTE_STATUS.QUEUED, ontology);
            // Note: Use setTimeout to defer side-effect outside render phase
            setTimeout(() => onSave(updated), 0);
            return updated;
        });
    }, [setDirtyNote, onSave, ontology]);

    return {
        isActive,
        handleToggleActive
    };
}
