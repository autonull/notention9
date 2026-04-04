import {useCallback, useMemo, useState} from 'react';
import {getPublicKey} from 'nostr-tools';
import type {NostrEvent, Note, Property} from '@notention/core';
import {
    convertEventToNote,
    DEFAULT_RELAYS,
    extractPropertiesFromTags,
    hexToBytes,
    SEMANTIC_NOTE_KIND
} from '@notention/core';
import {useNostrProfile} from './useNostrProfile';
import {useView} from '../useViewContext';
import {useSettings} from '../index';
import {useMatching} from '../../components/contexts/MatchingContext';
import {useGardener} from '../ontology/useGardener';
import {useNetworkActions} from './useNetworkActions';
import {useNostrSubscription} from './useNostrSubscription';

interface UseNetworkViewProps {
    matchAgainst?: Note | null;
}

export function useNetworkView({matchAgainst}: UseNetworkViewProps = {}) {
    const {settings} = useSettings();
    const {matchingService} = useMatching();
    const {setActiveView, setMatchingNoteId} = useView();
    const {learnFromProperties} = useGardener();
    const {applyMatchToNote: applyMatch, forkNote} = useNetworkActions();

    const relays = useMemo(() => settings.nostr.relays || DEFAULT_RELAYS, [settings.nostr.relays]);

    const onNavigateToSettings = () => setActiveView('settings');
    const pubkey = useMemo(
        () =>
            settings.nostr?.privkey
                ? getPublicKey(hexToBytes(settings.nostr.privkey))
                : null,
        [settings.nostr?.privkey]
    );
    const [filter, setFilter] = useState('');

    const kinds = useMemo(() => [1, SEMANTIC_NOTE_KIND], []);

    const onBatch = useCallback((newEvents: NostrEvent[]) => {
        const allProps: Property[] = newEvents.flatMap(evt => extractPropertiesFromTags(evt.tags));
        if (allProps.length > 0) {
            learnFromProperties(allProps);
        }
    }, [learnFromProperties]);

    const {events, isLoading} = useNostrSubscription({
        relays,
        kinds,
        limit: 50,
        enabled: !!pubkey,
        onBatch
    });

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

    const authorPubkeys = useMemo(() => {
        const pubkeys = new Set(sortedEvents.map((e) => e.pubkey));
        if (pubkey) {
            pubkeys.add(pubkey);
        }
        return Array.from(pubkeys);
    }, [sortedEvents, pubkey]);

    const profiles = useNostrProfile(authorPubkeys);

    const applyMatchToNote = (event: NostrEvent) => {
        if (matchAgainst) {
            applyMatch(matchAgainst, event);
        }
    };

    return {
        settings,
        pubkey,
        onNavigateToSettings,
        setMatchingNoteId,
        filter,
        setFilter,
        isLoading,
        sortedEvents,
        profiles,
        applyMatchToNote,
        forkNote,
    };
};
