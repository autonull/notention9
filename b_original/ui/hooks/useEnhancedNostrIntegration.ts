import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettingsContext';
import { useToast } from '../hooks/useToast';
import { Note, NostrEvent } from '@notention/core';
import { matchNotesWithRealVsImaginary } from '../utils/matching';
import { pool, DEFAULT_RELAYS, hexToBytes } from '@notention/core';
import { finalizeEvent } from 'nostr-tools';

interface UseEnhancedNostrIntegrationProps {
  onMatchFound?: (request: Note, offer: Note, matchResult: any) => void;
  onNoteReceived?: (event: NostrEvent) => void;
}

export const useEnhancedNostrIntegration = ({
  onMatchFound,
  onNoteReceived
}: UseEnhancedNostrIntegrationProps = {}) => {
  const { settings } = useSettings();
  const { addToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [receivedEvents, setReceivedEvents] = useState<NostrEvent[]>([]);
  const subscriptionRef = useRef<any>(null);

  // Enhanced publishing with better error handling and feedback
  const publishNote = useCallback(async (note: Note) => {
    if (!settings.nostr.privkey) {
      throw new Error('No private key found in settings. Please configure your Nostr identity.');
    }

    try {
      // Prepare the event with semantic properties as tags
      const tags = [
        ['d', note.id], // Identifier for the note
        ['title', note.title],
        ...note.tags.map(tag => ['t', tag]), // Hashtags
        // Convert semantic properties to Nostr tags
        ...note.properties.map(prop => [
          'property',
          prop.key,
          prop.operator,
          ...prop.values
        ])
      ];

      // Add additional metadata tags
      tags.push(['created_at', new Date(note.createdAt).getTime().toString()]);
      tags.push(['updated_at', new Date(note.updatedAt).getTime().toString()]);

      if (note.source) {
        tags.push(['source', note.source.type, note.source.identifier]);
      }

      const event = {
        kind: 1, // Standard text note
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: note.content,
      };

      const privkeyBytes = hexToBytes(settings.nostr.privkey);
      const signedEvent = finalizeEvent(event, privkeyBytes);

      // Publish to all configured relays
      const relays = settings.nostr.relays || DEFAULT_RELAYS;
      const pubs = pool.publish(relays, signedEvent);

      // Track publication promises
      const pubPromises = pubs.map(pub => new Promise((resolve, reject) => {
        pub.on('ok', () => {
          console.log(`Event ${signedEvent.id} accepted by relay`);
          resolve(signedEvent.id);
        });

        pub.on('failed', (relay: any) => {
          console.error(`Event ${signedEvent.id} rejected by relay:`, relay);
          reject(new Error(`Failed to publish to relay: ${relay}`));
        });
      }));

      // Wait for at least one successful publication
      await Promise.any(pubPromises);

      addToast(`Note published successfully`, 'success');
      return signedEvent.id;
    } catch (error: any) {
      console.error('Failed to publish note:', error);
      addToast(`Failed to publish: ${error.message}`, 'error');
      throw error;
    }
  }, [settings.nostr.privkey, settings.nostr.relays, addToast]);

  // Enhanced subscription with semantic matching
  const startListening = useCallback(() => {
    if (!settings.nostr.privkey) {
      addToast('Configure your Nostr identity to receive network notes', 'warning');
      return;
    }

    try {
      const pubkey = settings.nostr.pubkey || '';
      const relays = settings.nostr.relays || DEFAULT_RELAYS;

      // Subscribe to notes from the network
      const filters = [
        {
          kinds: [1], // Text notes
          since: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // Last 24 hours
        }
      ];

      subscriptionRef.current = pool.subscribeMany(
        relays,
        filters,
        {
          onevent: (event: NostrEvent) => {
            // Only process events that have semantic properties
            const hasSemanticTags = event.tags.some(tag =>
              tag[0] === 'property' || tag.some(field => field.includes(':'))
            );

            if (hasSemanticTags) {
              setReceivedEvents(prev => {
                // Avoid duplicates
                if (!prev.some(e => e.id === event.id)) {
                  return [...prev, event];
                }
                return prev;
              });

              // Notify if callback provided
              onNoteReceived?.(event);

              // Check for matches with local notes
              checkForMatches(event);
            }
          },
          oneose: () => {
            console.log('Subscription ended');
          }
        }
      );

      setIsListening(true);
      addToast('Started listening to Nostr network', 'info');
    } catch (error) {
      console.error('Failed to start Nostr subscription:', error);
      addToast('Failed to connect to Nostr network', 'error');
    }
  }, [settings.nostr, addToast, onNoteReceived]);

  const stopListening = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
      subscriptionRef.current = null;
    }
    setIsListening(false);
    addToast('Stopped listening to Nostr network', 'info');
  }, [addToast]);

  // Function to check for matches between incoming events and local notes
  const checkForMatches = useCallback(async (incomingEvent: NostrEvent) => {
    // This would typically fetch local notes to match against
    // For now, we'll just log the potential match
    console.log('Checking for matches with incoming event:', incomingEvent);
  }, []);

  // Auto-start listening when settings are available
  useEffect(() => {
    if (settings.nostr.privkey && !isListening) {
      startListening();
    }
  }, [settings.nostr.privkey, isListening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
      }
    };
  }, []);

  return {
    publishNote,
    startListening,
    stopListening,
    isListening,
    receivedEvents,
    addReceivedEvent: setReceivedEvents
  };
};