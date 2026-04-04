import {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import type {Note, ScoredMatch, NostrEvent} from '@notention/core';
import {useNotes, useSettings} from '../index';
import {useMatching} from '../../components/contexts/MatchingContext';
import {useView} from '../useViewContext';
import {useToast} from '../useToast';
import {convertEventToNote, DEFAULT_RELAYS, SEMANTIC_NOTE_KIND} from '@notention/core';
import {useNostrSubscription} from './useNostrSubscription';

export function useMatchDiscovery(note: Note | null) {
    const {settings} = useSettings();
    const {notes} = useNotes();
    const {engine, matchingService} = useMatching();
    const {addMatch} = useView();
    const {addToast} = useToast();

    // 1. Local Matching Logic (from useMatches)
    const [localMatches, setLocalMatches] = useState<ScoredMatch[]>([]);

    useEffect(() => {
        if (!note || !notes) {
            setLocalMatches([]);
            return;
        }

        const results: ScoredMatch[] = notes
            .filter(other => other.id !== note.id)
            .map(other => {
                const forward = engine.calculateMatchScore(note, other);
                const reverse = engine.calculateMatchScore(other, note);

                if (forward.score >= reverse.score) {
                    return { note: other, result: forward, direction: 'outgoing' as const };
                } else {
                    return { note: other, result: reverse, direction: 'incoming' as const };
                }
            })
            .filter(m => m.result.score > 0.3)
            .sort((a, b) => b.result.score - a.result.score);

        setLocalMatches(results);
    }, [note, notes, engine]);


    // 2. Background Matching Logic (from useBackgroundMatcher)
    const seenEvents = useRef(new Set<string>());
    const relays = useMemo(() => settings.nostr.relays || DEFAULT_RELAYS, [settings.nostr.relays]);
    const kinds = useMemo(() => [1, SEMANTIC_NOTE_KIND], []);
    // We only want events since hook mount for background matching to avoid spamming historical toasts
    const since = useMemo(() => Math.floor(Date.now() / 1000), []);

    const onBatch = useCallback((newEvents: NostrEvent[]) => {
        newEvents.forEach((event) => {
            if (seenEvents.current.has(event.id)) return;
            seenEvents.current.add(event.id);

            const offerNote = convertEventToNote(event);

            notes.forEach(localNote => {
                const result = matchingService.matchNotes(localNote, offerNote);

                if (result.score > 0.6) {
                    addMatch({
                        localNoteId: localNote.id,
                        event,
                        score: result.score,
                        timestamp: Date.now(),
                        satisfied: result.satisfied
                    });

                    if (result.score > 0.8) {
                        addToast(`New match found for "${localNote.title || 'Note'}"!`, 'info');
                    }
                }
            });
        });
    }, [notes, matchingService, addMatch, addToast]);

    useNostrSubscription({
        relays,
        kinds,
        limit: 0,
        since,
        enabled: notes.length > 0,
        onBatch
    });

    return {
        localMatches
    };
}
