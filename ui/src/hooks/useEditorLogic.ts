import { useCallback } from 'react';
import { Note, OntologyNode } from '@notention/core';
import { useView } from './useViewContext';
import { useOntologyMatching } from './useOntologyMatching';
import { useEditorPublishing } from './useEditorPublishing';
import { useNotePersistence } from './editor/useNotePersistence';
import { useNoteProperties } from './editor/useNoteProperties';
import { useNoteStatus } from './editor/useNoteStatus';
import { useNoteIntegration } from './editor/useNoteIntegration';
import { useSettings } from './useSettingsContext';

interface UseEditorLogicProps {
    note: Note;
    onSave: (note: Note) => void;
}

export function useEditorLogic({ note, onSave }: UseEditorLogicProps) {
    const { setActiveView, setMatchingNoteId } = useView();
    const { settings } = useSettings();
    const ontology = settings.ontology || [];

    const {
        dirtyNote,
        setDirtyNote,
        saveStatus,
        saveImmediately
    } = useNotePersistence(note, onSave);

    const {
        handleContentSave,
        handleUpdateTextFromInspector,
        handleUpdateProperty,
        handleUpdateLocation
    } = useNoteProperties(dirtyNote, setDirtyNote, ontology);

    const {
        isActive,
        handleToggleActive
    } = useNoteStatus(dirtyNote, setDirtyNote, onSave, ontology);

    const {
        handleMagic,
        handleAutoTag,
        handleTagsChange,
        handleSaveTemplate,
        isAutoTagging,
        isApiKeyAvailable
    } = useNoteIntegration(dirtyNote, setDirtyNote, handleContentSave, ontology);

    const {
        matchingOntologyNode,
        actionLabel,
        validationErrors,
        missingProperties
    } = useOntologyMatching({
        tags: dirtyNote.tags,
        properties: dirtyNote.properties,
        ontology
    });

    const {
        handlePublish,
        isPublishing,
        privacyConfirmation,
        handlePrivacyConfirm,
        handlePrivacyCancel
    } = useEditorPublishing({
        dirtyNote,
        setDirtyNote,
        onSave,
        validationErrors,
        actionLabel
    });

    const handleFindMatches = useCallback(() => {
        setMatchingNoteId(dirtyNote.id);
        setActiveView('network');
    }, [dirtyNote.id, setMatchingNoteId, setActiveView]);

    const handleNoteUpdate = useCallback((updates: Partial<Note>) => {
        setDirtyNote(prev => ({ ...prev, ...updates }));
    }, [setDirtyNote]);

    return {
        dirtyNote,
        handleNoteUpdate,
        isPublishing,
        handleTitleChange: useCallback((e: React.ChangeEvent<HTMLInputElement>) =>
            setDirtyNote(prev => ({ ...prev, title: e.target.value })), [setDirtyNote]),
        handleTagsChange,
        handlePublish,
        handleFindMatches,
        handleContentSave,
        handleUpdateTextFromInspector,
        handleUpdateLocation,
        handleUpdateProperty,
        handleAutoTag,
        handleMagic,
        handleSaveTemplate,
        saveImmediately,
        isAutoTagging,
        isApiKeyAvailable,
        settings,
        isPublished: !!dirtyNote.nostrEventId,
        isActive,
        handleToggleActive,
        actionLabel,
        validationErrors,
        missingProperties,
        matchingOntologyNode,
        saveStatus,
        privacyConfirmation,
        handlePrivacyConfirm,
        handlePrivacyCancel
    };
}
