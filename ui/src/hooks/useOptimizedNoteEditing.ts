import {useCallback, useMemo, useState} from 'react';
import {Note, PrivacyLevel, NotePipeline} from '@notention/core';
import {createUpdateHandler} from '../utils/ui';

/**
 * Optimized hook for managing note editing state with performance considerations
 */
export function useOptimizedNoteEditing(initialNote?: Note | null) {
    const [currentNote, setCurrentNote] = useState<Note | null>(initialNote || null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const handleUpdate = useMemo(() => createUpdateHandler(setCurrentNote, setHasUnsavedChanges), []);

    // Memoize note properties to prevent unnecessary re-renders
    const noteData = useMemo(() => {
        if (!currentNote) return null;
        return {...currentNote};
    }, [currentNote]);

    // Efficient update functions using NotePipeline
    const updateNoteContent = useCallback((content: string) =>
        handleUpdate(prev => NotePipeline.updateContent(prev, content)), [handleUpdate]);

    const updateNoteTitle = useCallback((title: string) =>
        handleUpdate(prev => ({...prev, title, updatedAt: new Date().toISOString()})), [handleUpdate]);

    const updateNoteTags = useCallback((tags: string[]) =>
        handleUpdate(prev => ({...prev, tags, updatedAt: new Date().toISOString()})), [handleUpdate]);

    const updateNotePrivacy = useCallback((privacy: PrivacyLevel) =>
        handleUpdate(prev => ({...prev, privacy, updatedAt: new Date().toISOString()})), [handleUpdate]);

    const resetUnsavedChanges = useCallback(() => setHasUnsavedChanges(false), []);

    return {
        currentNote,
        noteData,
        isSaving,
        hasUnsavedChanges,
        setCurrentNote,
        setIsSaving,
        updateNoteContent,
        updateNoteTitle,
        updateNoteTags,
        updateNotePrivacy,
        resetUnsavedChanges
    };
};