import {useMemo, useState} from 'react';
import type {NostrEvent, Note} from '@notention/core';
import {useNetworkData} from './useNetworkData';
import {useNetworkFilters} from './useNetworkFilters';
import {useNetworkActions} from './useNetworkActions';
import {useNostrProfile} from './useNostrProfile';
import {useView} from './useViewContext';
import {useSettings} from './useSettingsContext';

interface UseNetworkViewProps {
    matchAgainst?: Note | null;
}

export function useNetworkView({matchAgainst}: UseNetworkViewProps = {}) {
    const {settings} = useSettings();
    const {setActiveView, setMatchingNoteId} = useView();
    const {applyMatchToNote: applyMatch, forkNote} = useNetworkActions();

    const onNavigateToSettings = () => setActiveView('settings');

    const {events, isLoading, pubkey, profiles: allProfiles, setEvents} = useNetworkData();
    const [filter, setFilter] = useState('');
    const {sortedEvents} = useNetworkFilters({events, filter, matchAgainst});

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
        setEvents
    };
}