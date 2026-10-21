import {useMemo} from 'react';
import type {NostrEvent} from '@notention/core';
import {Note, convertEventToNote, Property} from '@notention/core';
import {useMatching} from '../components/contexts/MatchingContext';

interface UseNetworkFiltersProps {
    events: NostrEvent[];
    filter: string;
    matchAgainst?: Note | null;
}

export function useNetworkFilters({events, filter, matchAgainst}: UseNetworkFiltersProps) {
    const {matchingService} = useMatching();

    const sortedEvents = useMemo(() => {
        let filtered = [...events];

        if (filter) {
            filtered = filtered.filter(e => e.content.toLowerCase().includes(filter.toLowerCase()));
        }

        if (matchAgainst) {
            return filtered.map(event => {
                const offerNote: Note = convertEventToNote(event);
                const matchDetails = matchingService.matchNotes(matchAgainst, offerNote);
                return {event, score: matchDetails.score * 100, details: matchDetails};
            })
                .sort((a, b) => b.score - a.score)
                .map(item => {
                    return {...item.event, score: item.score};
                })
                .slice(0, 100);
        }

        return filtered
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, 100);
    }, [events, filter, matchAgainst, matchingService]);

    return {
        sortedEvents
    };
}