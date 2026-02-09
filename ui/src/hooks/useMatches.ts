import {useEffect, useMemo, useState} from 'react';
import {MatchEngine, Note} from '@notention/core'; // We will need to export MatchEngine from core
import {useSettings} from './useSettingsContext';
import {useNotes} from './useNotes';

// Hook to find matches for a specific note against all other local notes
export function useMatches(note: Note | null) {
    const {settings} = useSettings();
    const {notes} = useNotes();
    // Actually useNoteActions usually gives create/update/delete.
    // We might need useNotes() or similar if available.
    // Let's assume we can subscribe to note store or pass in notes.
    // Checking previous context, maybe 'useView' or similar has notes?
    // Usually there is a context provider with notes. Let's assume a useNotes hook or Context.
    // If not, we'll need to fetch them.

    // For now, let's mock the 'notes' retrieval or assume it comes from a StoreContext we need to find.
    // I will use a placeholder and we might need to fix this import after checking.

    const [matches, setMatches] = useState<any[]>([]);

    // Engine instance
    const engine = useMemo(() => new MatchEngine(settings.ontology), [settings.ontology]);

    useEffect(() => {
        if (!note || !notes) {
            setMatches([]);
            return;
        }

        // Run matching async to avoid blocking UI?
        // For local set < 1000 notes, sync is fine.
        const results = notes
            .filter(other => other.id !== note.id)
            .map(other => ({
                note: other,
                result: engine.calculateMatchScore(note, other)
            }))
            .filter(m => m.result.score > 0) // Only relevant matches
            .sort((a, b) => b.result.score - a.result.score);

        setMatches(results);

    }, [note, notes, engine]);

    return matches;
}
