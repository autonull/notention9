import React from 'react';
import type { NostrEvent, NostrProfile } from '@notention/core';
import { NostrEventCard } from './NostrEventCard';
import { LoadingSpinner } from '../common/icons';

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
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <LoadingSpinner className="h-8 w-8 text-gray-400" />
            </div>
        );
    }

    if (sortedEvents.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                <p>No public notes found from connected relays.</p>
                <p className="text-sm mt-1">
                    This could be a temporary connection issue.
                </p>
            </div>
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
