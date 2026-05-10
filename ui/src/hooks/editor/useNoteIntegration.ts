import { useCallback } from 'react';
import { Note, OntologyNode } from '@notention/core';
import { useEditorMagic } from '../useEditorMagic';
import { useEditorTemplates } from '../useEditorTemplates';

export function useNoteIntegration(
    dirtyNote: Note,
    setDirtyNote: React.Dispatch<React.SetStateAction<Note>>,
    handleContentSave: (content: string) => void,
    ontology: OntologyNode[]
) {
    const handleTagsChange = useCallback((newTags: string[]) => {
        setDirtyNote(prev => ({ ...prev, tags: newTags }));
    }, [setDirtyNote]);

    const { handleMagic, handleAutoTag, isAutoTagging, isApiKeyAvailable } = useEditorMagic({
        noteId: dirtyNote.id,
        content: dirtyNote.content,
        tags: dirtyNote.tags,
        onTagsChange: handleTagsChange,
        onContentSave: handleContentSave,
        ontology
    });

    const { handleSaveTemplate } = useEditorTemplates({ dirtyNote });

    return {
        handleMagic,
        handleAutoTag,
        handleTagsChange,
        handleSaveTemplate,
        isAutoTagging,
        isApiKeyAvailable
    };
}
