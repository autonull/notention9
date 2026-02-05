import { useState, useEffect, useRef } from 'react';
import type { Note } from '@notention/core';
import { areNotesEqual, Logger } from '@notention/core';

const SAVE_DEBOUNCE_MS = 1000;

export const useDebouncedSave = (note: Note, onSave: (note: Note) => void) => {
  const [dirtyNote, setDirtyNote] = useState<Note>(note);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Refs for unmount safety
  const dirtyNoteRef = useRef(dirtyNote);
  const noteRef = useRef(note);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    dirtyNoteRef.current = dirtyNote;
  }, [dirtyNote]);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Sync state when note prop changes
  useEffect(() => {
    setDirtyNote((prev) => {
      // If ID changed, switch to new note
      if (note.id !== prev.id) return note;
      // If content matches upstream, sync reference to avoid unnecessary diffs
      return areNotesEqual(note, prev) ? note : prev;
    });
  }, [note]);

  // Debounced save effect
  useEffect(() => {
    // Only save if dirtyNote differs from the current upstream note
    if (areNotesEqual(dirtyNote, note)) {
        setSaveStatus('saved');
        return;
    }

    setSaveStatus('saving');
    const handler = setTimeout(() => {
        try {
            onSave(dirtyNote);
            setSaveStatus('saved');
        } catch (e) {
            Logger.getInstance().error("Auto-save failed", e instanceof Error ? e : new Error(String(e)));
            setSaveStatus('error');
        }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(handler);
  }, [dirtyNote, onSave, note]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (!areNotesEqual(dirtyNoteRef.current, noteRef.current)) {
        onSaveRef.current(dirtyNoteRef.current);
      }
    };
  }, []);

  return { dirtyNote, setDirtyNote, saveStatus };
};
