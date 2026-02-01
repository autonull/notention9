import { useCallback } from 'react';
import type { Note } from '@notention/core';
import { usePublish } from './usePublish';
import { useGardener } from './useGardener';
import { useToast } from './useToast';

interface UseEditorPublishingProps {
  dirtyNote: Note;
  setDirtyNote: (note: Note | ((prev: Note) => Note)) => void;
  onSave: (note: Note) => void;
  validationErrors: string[];
  actionLabel: string;
}

export const useEditorPublishing = ({
  dirtyNote,
  setDirtyNote,
  onSave,
  validationErrors,
  actionLabel,
}: UseEditorPublishingProps) => {
  const { publishNote, isPublishing } = usePublish();
  const { evolveOntology } = useGardener();
  const { addToast } = useToast();

  const handlePublish = useCallback(async () => {
    if (!dirtyNote.content) return;

    if (validationErrors.length > 0) {
      alert(`Cannot ${actionLabel}:\n- ${validationErrors.join('\n- ')}`);
      return;
    }

    if (
      confirm(
        `Are you sure you want to ${actionLabel.toLowerCase()} to the public Nostr network?`
      )
    ) {
      try {
        // Evolve ontology before publishing to ensure we capture semantics
        await evolveOntology([dirtyNote]);

        const eventId = await publishNote(dirtyNote);
        const now = new Date().toISOString();
        const updatedNote = {
          ...dirtyNote,
          nostrEventId: eventId,
          publishedAt: now,
        };
        setDirtyNote(updatedNote);
        onSave(updatedNote);
        addToast(`${actionLabel} successful!`, 'success');
      } catch (e) {
        addToast(
          'Failed to publish: ' +
            (e instanceof Error ? e.message : String(e)),
          'error'
        );
      }
    }
  }, [
    dirtyNote,
    validationErrors,
    actionLabel,
    evolveOntology,
    publishNote,
    setDirtyNote,
    onSave,
    addToast,
  ]);

  return {
    handlePublish,
    isPublishing,
  };
};
