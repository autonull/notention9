import { NotesContext } from '../components/contexts/NotesContext';
import { createContextHook } from '../utils/ui';

const useNotesBase = createContextHook(NotesContext, 'useNotes', 'NotesProvider');

export function useNotes() {
    return useNotesBase();
};
