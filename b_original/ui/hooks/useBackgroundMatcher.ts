import { useEffect, useRef } from 'react';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { useToast } from './useToast';
import { DEFAULT_RELAYS, pool, convertEventToNote } from '@notention/core';
import { matchingService } from '../services/MatchingService';

export const useBackgroundMatcher = () => {
  const { settings } = useSettings();
  const { notes } = useNotes(); // Local notes
  const { addMatch } = useView();
  const { addToast } = useToast();

  // Use a ref to track seen events to avoid re-notifying
  const seenEvents = useRef(new Set<string>());

  useEffect(() => {
    // Only run if we have local notes to match against
    if (notes.length === 0) return;

    const relays = settings.nostr.relays || DEFAULT_RELAYS;

    const sub = pool.subscribeMany(
      relays,
      [{ kinds: [1], limit: 0, since: Math.floor(Date.now() / 1000) }], // Only new events
      {
        onevent: (event) => {
          if (seenEvents.current.has(event.id)) return;
          seenEvents.current.add(event.id);

          // Convert to note for matching
          const offerNote = convertEventToNote(event);

          // Check against all local notes
          // This is O(N) per event.
          notes.forEach(localNote => {
             // Only match if local note has semantic properties?
             // Or if it has any content.
             const result = matchingService.matchNotes(localNote, offerNote);

             if (result.score > 0.6) { // Threshold
                 addMatch({
                     localNoteId: localNote.id,
                     event,
                     score: result.score,
                     timestamp: Date.now(),
                     satisfied: result.satisfied
                 });
                 // Optional: Toast for high relevance
                 if (result.score > 0.8) {
                    // Only toast if it's REALLY good, and the throttle in ViewContext handles spam
                    addToast(`New match found for "${localNote.title || 'Note'}"!`, 'info');
                 }
             }
          });
        },
      }
    );

    return () => {
      sub.close();
    };
  }, [notes, settings.nostr.relays, addMatch, addToast]);
};
