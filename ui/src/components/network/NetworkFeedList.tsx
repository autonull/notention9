import React from 'react';
import type {NostrEvent, NostrProfile} from '@notention/core';
import {NostrEventCard} from './NostrEventCard';
import {LoadingSpinner, SettingsIcon} from '../ui/icons';
import {Button} from '../ui/Button';
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
            <div className="flex justify-center items-center h-48">
                <LoadingSpinner className="h-8 w-8 text-gray-400"/>
            </div>
        );
    }

    if (sortedEvents.length === 0) {
        return (
            <EmptyState
                variant="illustrated"
                illustration={<NetworkEmptyIllustration/>}
                title="No network notes found"
                description="We couldn't find any notes from your connected relays. Publish a note to share it with the network, or check your connection settings."
                action={
                    <Button
                        variant="primary"
                        leftIcon={<SettingsIcon className="w-4 h-4"/>}
                        onClick={() => setActiveView('settings')}
                    >
                        Check Connection Settings
                    </Button>
                }
                secondaryAction={
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
