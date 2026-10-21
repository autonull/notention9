import {useEffect, useMemo, useRef, useState} from 'react';
import {getPublicKey} from 'nostr-tools';
import type {NostrEvent} from '@notention/core';
import {
    DEFAULT_RELAYS,
    extractPropertiesFromTags,
    hexToBytes,
    pool,
    SEMANTIC_NOTE_KIND
} from '@notention/core';
import {useNostrProfile} from './useNostrProfile';
import {useSettings} from './useSettingsContext';
import {useGardener} from './useGardener';

interface UseNetworkDataProps {
    relays?: string[];
}

export function useNetworkData({relays = DEFAULT_RELAYS}: UseNetworkDataProps = {}) {
    const {settings} = useSettings();
    const {learnFromProperties} = useGardener();
    const effectiveRelays = settings.nostr?.relays || relays;

    const pubkey = useMemo(
        () =>
            settings.nostr?.privkey
                ? getPublicKey(hexToBytes(settings.nostr.privkey))
                : null,
        [settings.nostr?.privkey]
    );
    const [events, setEvents] = useState<NostrEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Batching refs
    const pendingEventsRef = useRef<NostrEvent[]>([]);
    const seenEventIdsRef = useRef(new Set<string>());
    const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!pubkey) return;

        setEvents([]);
        setIsLoading(true);
        seenEventIdsRef.current = new Set();
        pendingEventsRef.current = [];
        if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);

        const flushBatch = () => {
            if (pendingEventsRef.current.length > 0) {
                const newEvents = pendingEventsRef.current;
                setEvents((prev) => [...prev, ...newEvents]);

                // Passive Learning: Extract properties from new events
                const allProps = newEvents.flatMap(evt => extractPropertiesFromTags(evt.tags));

                if (allProps.length > 0) {
                    learnFromProperties(allProps);
                }

                pendingEventsRef.current = [];
            }
            batchTimeoutRef.current = null;
        };

        const sub = pool.subscribeMany(
            effectiveRelays,
            {kinds: [1, SEMANTIC_NOTE_KIND], limit: 50},
            {
                onevent: (event) => {
                    if (!seenEventIdsRef.current.has(event.id)) {
                        seenEventIdsRef.current.add(event.id);
                        pendingEventsRef.current.push(event);

                        if (!batchTimeoutRef.current) {
                            batchTimeoutRef.current = setTimeout(flushBatch, 500);
                        }
                    }
                },
            }
        );

        const timer = setTimeout(() => setIsLoading(false), 3000);

        return () => {
            clearTimeout(timer);
            if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
            sub.close();
        };
    }, [pubkey, learnFromProperties, effectiveRelays]);

    const authorPubkeys = useMemo(() => {
        const pubkeys = new Set(events.map((e) => e.pubkey));
        if (pubkey) {
            pubkeys.add(pubkey);
        }
        return Array.from(pubkeys);
    }, [events, pubkey]);

    const profiles = useNostrProfile(authorPubkeys);

    return {
        events,
        isLoading,
        pubkey,
        profiles,
        setEvents
    };
}