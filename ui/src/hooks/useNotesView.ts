import {useNotes} from './useNotes';
import {useView} from './useViewContext';

export function useNotesView() {
    const {notes, updateNote} = useNotes();
    const {selectedNoteId} = useView();
    const selectedNote = notes.find((note) => note.id === selectedNoteId);

    return {
        selectedNote,
        updateNote,
    };
};
