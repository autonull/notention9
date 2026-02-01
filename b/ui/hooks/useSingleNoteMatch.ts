import { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings } from './useSettingsContext';
import { DEFAULT_RELAYS, pool, convertEventToNote } from '@notention/core';
import { matchingService } from '../services/MatchingService';
import type { Note, NostrEvent } from '@notention/core';

export function useSingleNoteMatch(note: Note) {
    const { settings } = useSettings();
    const [events, setEvents] = useState<NostrEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const noteIdRef = useRef(note.id);

    useEffect(() => {
        // Reset if note changes
        if (note.id !== noteIdRef.current) {
            setEvents([]);
            setIsLoading(true);
            noteIdRef.current = note.id;
        }

        const relays = settings.nostr.relays || DEFAULT_RELAYS;
        const seen = new Set<string>();

        const sub = pool.subscribeMany(
            relays,
            [{ kinds: [1], limit: 20 }],
            {
                onevent: (event) => {
                    if(seen.has(event.id)) return;
                    seen.add(event.id);

                    setEvents(prev => [...prev, event]);
                },
                oneose: () => {
                    setIsLoading(false);
                }
            }
        );

        // Timeout to stop loading state visually, though subscription keeps running
        const timer = setTimeout(() => setIsLoading(false), 3000);

        return () => {
            sub.close();
            clearTimeout(timer);
        };
    }, [note.id, settings.nostr.relays]);

    const matches = useMemo(() => {
        // We can match even without properties using text overlap if implemented,
        // but typically matchNotes relies on properties.
        // Assuming matchNotes handles text fallback or we want to enforce semantics.

        return events.map(event => {
            const offer = convertEventToNote(event);
            // Don't match with self (if published)
            if (offer.nostrEventId === note.nostrEventId) return null;

            const result = matchingService.matchNotes(note, offer);
            return { event, score: result.score, satisfied: result.satisfied, failed: result.failed };
        })
        .filter((m): m is { event: NostrEvent, score: number, satisfied: any[], failed: any[] } => m !== null && m.score > 0.4)
        .sort((a, b) => b.score - a.score);
    }, [events, note]);

    return { matches, isLoading };
}
