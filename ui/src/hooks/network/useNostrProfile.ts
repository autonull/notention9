import {useEffect, useMemo, useRef, useState} from 'react';
import type {NostrEvent, NostrProfile} from '@notention/core';
import {DEFAULT_RELAYS, Logger, pool} from '@notention/core';

const profileCache = new Map<string, NostrProfile>();
const requestedPubkeys = new Set<string>();

export function useNostrProfile(
    pubkeys: string[]
): Record<string, NostrProfile> {
    // Use a stable key for dependency tracking to avoid loops if pubkeys is a new array literal with same content
    const pubkeysKey = useMemo(() => pubkeys.slice().sort().join(','), [pubkeys]);

    // Ref to access the latest pubkeys array inside useEffect without triggering re-runs on reference change
    const pubkeysRef = useRef(pubkeys);
    useEffect(() => {
        pubkeysRef.current = pubkeys;
    }, [pubkeys]);

    const [profiles, setProfiles] = useState<Record<string, NostrProfile>>(() => {
        const initialProfiles: Record<string, NostrProfile> = {};
        pubkeys.forEach((pk) => {
            if (profileCache.has(pk)) {
                initialProfiles[pk] = profileCache.get(pk)!;
            }
        });
        return initialProfiles;
    });

    useEffect(() => {
        const currentPubkeys = pubkeysRef.current;

        const pubkeysToFetch = currentPubkeys.filter(
            (pk) => !profileCache.has(pk) && !requestedPubkeys.has(pk)
        );

        // If nothing to fetch, just ensure we have latest from cache (in case cache updated elsewhere)
        if (pubkeysToFetch.length === 0) {
            setProfiles((currentProfiles) => {
                const newProfiles: Record<string, NostrProfile> = {};
                let hasChanged = false;

                currentPubkeys.forEach((pk) => {
                    if (profileCache.has(pk)) {
                        newProfiles[pk] = profileCache.get(pk)!;
                        if (currentProfiles[pk] !== newProfiles[pk]) {
                            hasChanged = true;
                        }
                    }
                });

                if (
                    hasChanged ||
                    Object.keys(newProfiles).length !== Object.keys(currentProfiles).length
                ) {
                    return newProfiles;
                }
                return currentProfiles;
            });
            return;
        }

        pubkeysToFetch.forEach((pk) => requestedPubkeys.add(pk));

        const handleEvent = (event: NostrEvent) => {
            try {
                const profile = JSON.parse(event.content) as NostrProfile;
                profileCache.set(event.pubkey, profile);
                setProfiles((prev) => ({...prev, [event.pubkey]: profile}));
            } catch (e) {
                Logger.getInstance().warn('Failed to parse Nostr profile', e instanceof Error ? e : new Error(String(e)));
            }
        };

        const sub = pool.subscribeMany(
            DEFAULT_RELAYS,
            {kinds: [0], authors: pubkeysToFetch},
            {
                onevent: handleEvent,
            }
        );

        return () => {
            sub.close();
        };
    }, [pubkeysKey]);

    return profiles;
};
