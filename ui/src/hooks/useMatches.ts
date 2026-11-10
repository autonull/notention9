import {useEffect, useMemo, useState} from 'react';
import type {Note, ScoredMatch} from '@notention/core';
import {findLocalMatches} from '../../../core/src/matching/bidirectional.js';
import {useNotes} from './useNotes';
import {useMatching} from '../components/contexts/MatchingContext';
import {useRejectedMatches} from './useRejectedMatches';

// Hook to find matches for a specific note against all other local notes
export function useMatches(note: Note | null): ScoredMatch[] {
    const {notes} = useNotes();
    const {engine} = useMatching();
    const {isRejected} = useRejectedMatches();

    const [matches, setMatches] = useState<ScoredMatch[]>([]);

    useEffect(() => {
        if (!note || !notes) {
            setMatches([]);
            return;
        }

        // Use common bidirectional matching utility
        const results = findLocalMatches(engine, note, notes, 0.3);

        // Filter out rejected matches
        const filtered = results.filter(m => !isRejected(m.note.id));

        setMatches(filtered);

    }, [note, notes, engine, isRejected]);

    return matches;
}
