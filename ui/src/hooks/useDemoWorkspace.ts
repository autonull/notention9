import {useCallback} from 'react';
import {buildDemoWorkspace, DEMO_NOTE_IDS} from '@notention/core';
import {useNotes} from './useNotes';
import {useToast} from './useToast';

export function useDemoWorkspace() {
    const {notes, upsertNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();

    const sampleCount = notes.filter(note => DEMO_NOTE_IDS.includes(note.id)).length;
    const hasSampleData = sampleCount > 0;

    const load = useCallback(() => {
        const demo = buildDemoWorkspace();
        demo.forEach(note => upsertNote(note));
        addToast(`Sample workspace loaded with ${demo.length} notes`, 'success');
    }, [upsertNote, addToast]);

    const remove = useCallback(() => {
        DEMO_NOTE_IDS.forEach(id => permanentlyDeleteNote(id));
        addToast('Sample workspace removed', 'success');
    }, [permanentlyDeleteNote, addToast]);

    return {load, remove, hasSampleData, sampleCount};
}
