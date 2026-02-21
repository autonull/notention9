import {useEffect, useMemo, useState} from 'react';
import {MatchEngine, Note, ScoredMatch} from '@notention/core';
import {useSettings} from './useSettingsContext';
import {useNotes} from './useNotes';

// Hook to find matches for a specific note against all other local notes
export function useMatches(note: Note | null): ScoredMatch[] {
    const {settings} = useSettings();
    const {notes} = useNotes();

    const [matches, setMatches] = useState<ScoredMatch[]>([]);

    // Engine instance
    const engine = useMemo(() => new MatchEngine(settings.ontology), [settings.ontology]);

    useEffect(() => {
        if (!note || !notes) {
            setMatches([]);
            return;
        }

        // Run matching synchronously for local notes (assuming < 1000 notes is fast enough)
        const results: ScoredMatch[] = notes
            .filter(other => other.id !== note.id)
            .map(other => {
                // Determine directionality
                const forward = engine.calculateMatchScore(note, other);
                const reverse = engine.calculateMatchScore(other, note);

                if (forward.score >= reverse.score) {
                    return { note: other, result: forward, direction: 'outgoing' };
                } else {
                    return { note: other, result: reverse, direction: 'incoming' };
                }
            })
            .filter(m => m.result.score > 0.3) // Filter low relevance
            .sort((a, b) => b.result.score - a.result.score);

        setMatches(results);

    }, [note, notes, engine]);

    return matches;
}
