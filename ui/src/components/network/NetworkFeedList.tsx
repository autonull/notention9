import React from 'react';
import type {NostrEvent, NostrProfile} from '@notention/core';
import {NostrEventCard} from './NostrEventCard';
import {SettingsIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {Skeleton} from '../ui/Skeleton';
import {EmptyState, NetworkEmptyIllustration} from '../ui/Primitives';
import {useView} from '../../hooks/useViewContext';

interface NetworkFeedListProps {
    isLoading: boolean;
    sortedEvents: NostrEvent[];
    profiles: Record<string, NostrProfile>;
    onApplyMatch?: (event: NostrEvent) => void;
    onFork: (event: NostrEvent) => void;
}

export function NetworkFeedList({
                                    isLoading,
                                    sortedEvents,
                                    profiles,
                                    onApplyMatch,
                                    onFork
                                }: NetworkFeedListProps) {
    const {setActiveView} = useView();

    if (isLoading) {
        return (
            <div className="space-y-4" aria-busy="true" aria-label="Loading network feed">
                {Array.from({length: 3}).map((_, index) => (
                    <Skeleton key={index} variant="network-event" height={132} width="100%"/>
                ))}
            </div>
        );
    }

    if (sortedEvents.length === 0) {
        return (
            <EmptyState
                variant="illustrated"
                illustration={<NetworkEmptyIllustration/>}
                title="No network notes found"
                description="We couldn't find any notes from your connected relays. Publish a note to share it with the network."
                action={
                    <Button variant="ghost" size="sm" onClick={() => setActiveView('notes')}>
                        Create a note to publish
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            {sortedEvents.map((event) => (
                <NostrEventCard
                    key={event.id}
                    event={event}
                    profile={profiles[event.pubkey]}
                    onApplyMatch={onApplyMatch}
                    onFork={() => onFork(event)}
                />
            ))}
        </div>
    );
};
