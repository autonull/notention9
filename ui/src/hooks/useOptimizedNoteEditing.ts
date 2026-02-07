import { useMemo, useState, useCallback } from 'react';
import { Note, PrivacyLevel } from '@notention/core';

/**
 * Optimized hook for managing note editing state with performance considerations
 */
export const useOptimizedNoteEditing = (initialNote?: Note | null) => {
  const [currentNote, setCurrentNote] = useState<Note | null>(initialNote || null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Memoize note properties to prevent unnecessary re-renders
  const noteData = useMemo(() => {
    if (!currentNote) return null;
    return {
      id: currentNote.id,
      title: currentNote.title,
      content: currentNote.content,
      tags: [...currentNote.tags],
      properties: [...currentNote.properties],
      createdAt: currentNote.createdAt,
      updatedAt: currentNote.updatedAt,
      privacy: currentNote.privacy,
      priority: currentNote.priority
    };
  }, [currentNote]);

  // Efficient update functions
  const updateNoteContent = useCallback((newContent: string) => {
    setCurrentNote(prev => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, content: newContent, updatedAt: new Date().toISOString() };
    });
  }, []);

  const updateNoteTitle = useCallback((newTitle: string) => {
    setCurrentNote(prev => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, title: newTitle, updatedAt: new Date().toISOString() };
    });
  }, []);

  const updateNoteTags = useCallback((newTags: string[]) => {
    setCurrentNote(prev => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, tags: newTags, updatedAt: new Date().toISOString() };
    });
  }, []);

  const updateNotePrivacy = useCallback((privacy: PrivacyLevel) => {
    setCurrentNote(prev => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return { ...prev, privacy, updatedAt: new Date().toISOString() };
    });
  }, []);

  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

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