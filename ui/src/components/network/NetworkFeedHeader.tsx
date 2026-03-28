import React from 'react';
import type {NostrEvent, OntologyNode} from '@notention/core';
import {ArrowLeftIcon} from '../common/icons';
import {IconButton} from '../common/IconButton';
import {Input} from '../common/Input';

interface NetworkFeedHeaderProps {
    matchAgainstTitle?: string;
    onClearMatch: () => void;
    filter: string;
    setFilter: (filter: string) => void;
    sortedEvents: NostrEvent[];
    ontology?: OntologyNode[];
    activeFilterId?: string;
    setActiveFilterId?: (id: string) => void;
    relayCount?: number;
}

export function NetworkFeedHeader({
                                      matchAgainstTitle,
                                      onClearMatch,
                                      filter,
                                      setFilter,
                                      sortedEvents,
                                      ontology,
                                      activeFilterId = 'all',
                                      setActiveFilterId,
                                      relayCount = 0
                                  }: NetworkFeedHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
                {matchAgainstTitle && (
                    <IconButton
                        onClick={onClearMatch}
                        icon={ArrowLeftIcon}
                        title="Back to Feed"
                        variant="ghost"
                        size="md"
                    />
                )}
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-white truncate flex items-center gap-2">
                        🌐 Network
                    </h1>
                    <span className="text-xs text-gray-400 mt-1">📡 Connected to {relayCount} relays | 👁 {sortedEvents.length} notes visible | ⚡ Live</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-end md:items-center gap-3 w-full md:w-auto">
                <button className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-md flex items-center gap-2">
                    <span>My Relays ▼</span>
                </button>
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Filter notes..."
                        className="w-full md:w-48 pl-8 bg-gray-900 border-gray-700 text-sm h-8"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <span className="absolute left-2.5 top-2 text-gray-500 text-xs">🔍</span>
                </div>
            </div>
        </div>
    );
};
