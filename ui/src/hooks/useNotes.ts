import {useContext} from 'react';
import {NotesContext} from '../components/contexts/NotesContext';

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error('useNotes must be used within a NotesProvider');
    }

    // Backwards compatibility alias for notesLoading
    return {
        ...context,
        notesLoading: context.loading
    };
};
