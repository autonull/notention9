import {useMemo} from 'react';
import type {Note, Property} from '@notention/core';
import {useMatching} from '../components/contexts/MatchingContext';

export interface MatchResult {
    source: Note;
    target: Note;
    score: number;
    satisfied?: Property[];
}

export function useNetworkMatching(networkNotes: Note[]) {
    const {matchingService} = useMatching();

    return useMemo(() => {
        const found: MatchResult[] = [];

        for (let i = 0; i < networkNotes.length; i++) {
            for (let j = 0; j < networkNotes.length; j++) {
                if (i === j) continue;
                const source = networkNotes[i];
                const target = networkNotes[j];

                // Explicitly prevent self-matching if ID check failed
                if (source.id === target.id) continue;

                const result = matchingService.matchNotes(source, target);
                if (result.score > 0.5) {
                    found.push({source, target, score: result.score, satisfied: result.satisfied});
                }
            }
        }
        return found;
    }, [networkNotes, matchingService]);
}
