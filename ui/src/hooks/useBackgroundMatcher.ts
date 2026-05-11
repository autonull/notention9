import {useEffect, useRef} from 'react';
import {useSettings} from './useSettingsContext';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useToast} from './useToast';
import {useMatching} from '../components/contexts/MatchingContext';
import {convertEventToNote, DEFAULT_RELAYS, pool} from '@notention/core';

export function useBackgroundMatcher() {
    const {settings} = useSettings();
    const {matchingService} = useMatching();
    const {notes} = useNotes(); // Local notes
    const {addMatch} = useView();
    const {addToast} = useToast();

    // Use a ref to track seen events to avoid re-notifying
    const seenEvents = useRef(new Set<string>());

    useEffect(() => {
        // Only run if we have local notes to match against
        if (notes.length === 0) return;

        const relays = settings.nostr.relays || DEFAULT_RELAYS;

        const sub = pool.subscribeMany(
            relays,
            {kinds: [1], limit: 0, since: Math.floor(Date.now() / 1000)}, // Only new events
            {
                onevent: (event) => {
                    if (seenEvents.current.has(event.id)) return;
                    seenEvents.current.add(event.id);

                    // Convert to note for matching
                    const offerNote = convertEventToNote(event);

                    // Check against all local notes
                    notes.map(localNote => ({
                        localNote,
                        result: matchingService.matchNotes(localNote, offerNote)
                    })).filter(m => m.result.score > 0.6)
                      .forEach(({localNote, result}) => {
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
                    });
                },
            }
        );

        return () => {
            sub.close();
        };
    }, [notes, settings.nostr.relays, addMatch, addToast, matchingService]);
};
