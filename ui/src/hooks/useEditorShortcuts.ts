import {useEffect} from 'react';
import type {Note} from '@notention/core';

interface UseEditorShortcutsProps {
    dirtyNote: Note;
    onSave: () => void;
    addToast: (msg: string, type: 'info' | 'error' | 'success') => void;
    handlePrevious: () => void;
    handleNext: () => void;
    setSelectedNoteId: (id: string | null) => void;
    onToggleActive?: () => void;
    onTogglePrivacy?: () => void;
    onFocusMatchPanel?: () => void;
}

export function useEditorShortcuts({
                                       dirtyNote,
                                       onSave,
                                       addToast,
                                       handlePrevious,
                                       handleNext,
                                       setSelectedNoteId,
                                       onToggleActive,
                                       onTogglePrivacy,
                                       onFocusMatchPanel
                                   }: UseEditorShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                onSave();
                addToast('Saved', 'success');
            }

            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                onToggleActive?.();
            }

            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                onTogglePrivacy?.();
            }

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                onFocusMatchPanel?.();
            }

            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                handlePrevious();
            }

            if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                handleNext();
            }

            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                setSelectedNoteId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dirtyNote, onSave, addToast, handlePrevious, handleNext, setSelectedNoteId]);
};
