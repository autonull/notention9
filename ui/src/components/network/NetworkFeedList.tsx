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
                <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300">No public notes found</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                    We couldn't find any notes from your connected relays.
                    Try publishing a note yourself or check your connection settings.
                </p>
                <div className="mt-6">
                     <button
                        onClick={() => window.location.hash = '#settings'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-200 bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Check Connection Settings
                    </button>
                </div>
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
