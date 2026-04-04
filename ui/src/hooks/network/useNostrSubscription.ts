import {useEffect, useRef, useState} from 'react';
import type {NostrEvent} from '@notention/core';
import {pool} from '@notention/core';

interface UseNostrSubscriptionOptions {
    relays: string[];
    kinds: number[];
    limit?: number;
    since?: number;
    enabled?: boolean;
    onBatch?: (events: NostrEvent[]) => void;
}

export function useNostrSubscription({
    relays,
    kinds,
    limit = 50,
    since,
    enabled = true,
    onBatch
}: UseNostrSubscriptionOptions) {
    const [events, setEvents] = useState<NostrEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Batching refs
    const pendingEventsRef = useRef<NostrEvent[]>([]);
    const seenEventIdsRef = useRef(new Set<string>());
    const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) return;

        setEvents([]); // Clear previous events
        setIsLoading(true);
        seenEventIdsRef.current = new Set();
        pendingEventsRef.current = [];
        if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);

        const flushBatch = () => {
            if (pendingEventsRef.current.length > 0) {
                const newEvents = pendingEventsRef.current;
                setEvents((prev) => [...prev, ...newEvents]);

                if (onBatch) {
                    onBatch(newEvents);
                }

                pendingEventsRef.current = [];
            }
            batchTimeoutRef.current = null;
        };

        const filter: any = {kinds, limit};
        if (since) filter.since = since;

        const sub = pool.subscribeMany(
            relays,
            filter,
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
    }, [relays, enabled, limit, since, onBatch]); // Removed `kinds` to avoid deep equality issues, assumed constant for now or use JSON.stringify

    return {events, isLoading};
}
