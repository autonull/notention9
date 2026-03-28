import React, {useMemo, useState} from 'react';

import {useNetworkView} from '../../hooks/useNetworkView';
import type {Note} from '@notention/core';
import {findNode, getSubtreeKeys, parseProperties} from '@notention/core';
import {ProfileHeader} from '../network/ProfileHeader';
import {ConnectIdentityPrompt} from '../network/ConnectIdentityPrompt';
import {NetworkFeedHeader} from '../network/NetworkFeedHeader';
import {SuggestedMatches} from '../network/SuggestedMatches';
import {NetworkFeedList} from '../network/NetworkFeedList';

interface NetworkViewProps {
    matchAgainst?: Note | null;
}

export function NetworkView({matchAgainst}: NetworkViewProps) {
    const {
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
    } = useNetworkView({matchAgainst});

    const [activeFilterId, setActiveFilterId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'browse' | 'published' | 'matches'>('browse');

    // Derive top-level categories from ontology
    const rootCategories = useMemo(() => {
        return settings.ontology || [];
    }, [settings.ontology]);

    const relayCount = useMemo(() => {
        return settings.nostr.relays?.length || 0;
    }, [settings.nostr.relays]);

    const myPublishedEvents = useMemo(() => {
        if (!pubkey) return [];
        return sortedEvents.filter(event => event.pubkey === pubkey);
    }, [sortedEvents, pubkey]);

    // Simplified mock for matches, could be based on ontology intersection or reply tags later
    const incomingMatchEvents = useMemo(() => {
        return sortedEvents.filter(event => {
            return event.tags.some(tag => tag[0] === 'e') && event.pubkey !== pubkey;
        });
    }, [sortedEvents, pubkey]);

    const filteredEvents = useMemo(() => {
        let baseEvents = sortedEvents;

        if (activeTab === 'published') {
            baseEvents = myPublishedEvents;
        } else if (activeTab === 'matches') {
            baseEvents = incomingMatchEvents;
        }

        if (activeFilterId === 'all') return baseEvents;

        const selectedNode = findNode(settings.ontology, activeFilterId);
        if (!selectedNode) return sortedEvents;

        const keysInBranch = getSubtreeKeys(selectedNode);

        return baseEvents.filter(event => {
            // Parse properties from content (since they might not be in tags)
            // Optimization: Check for presence of key strings first before full parse?
            // Full parse is safer.
            const props = parseProperties(event.content);

            // Also check explicit tags if we store them there in future
            // Check if any property key exists in the branch
            return props.some(p => keysInBranch.has(p.key));
        });
    }, [sortedEvents, activeFilterId, settings.ontology, activeTab, myPublishedEvents, incomingMatchEvents]);

    if (!pubkey) {
        return <ConnectIdentityPrompt onNavigateToSettings={onNavigateToSettings}/>;
    }

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-white rounded-lg overflow-hidden custom-scrollbar">
            <ProfileHeader
                settings={settings}
                pubkey={pubkey}
                profileCache={profiles}
            />
            <div className="p-4 md:p-6 flex-grow overflow-y-auto">
                <NetworkFeedHeader
                    matchAgainstTitle={matchAgainst?.title}
                    onClearMatch={() => setMatchingNoteId(null)}
                    filter={filter}
                    setFilter={setFilter}
                    sortedEvents={filteredEvents}
                    ontology={rootCategories}
                    activeFilterId={activeFilterId}
                    setActiveFilterId={setActiveFilterId}
                    relayCount={relayCount}
                />

                <div className="mb-6 flex gap-4 border-b border-gray-700/50 pb-2">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`text-sm font-semibold pb-2 px-2 -mb-[9px] ${
                            activeTab === 'browse'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        Browse
                    </button>
                    <button
                        onClick={() => setActiveTab('published')}
                        className={`text-sm font-semibold pb-2 px-2 -mb-[9px] ${
                            activeTab === 'published'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        My Published ({myPublishedEvents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`text-sm font-semibold pb-2 px-2 -mb-[9px] ${
                            activeTab === 'matches'
                            ? 'text-white border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        Incoming Matches ({incomingMatchEvents.length})
                    </button>
                </div>

                {!matchAgainst && !filter && activeFilterId === 'all' && activeTab === 'browse' && <SuggestedMatches/>}

                <NetworkFeedList
                    isLoading={isLoading}
                    sortedEvents={filteredEvents}
                    profiles={profiles}
                    onApplyMatch={matchAgainst ? applyMatchToNote : undefined}
                    onFork={forkNote}
                />
            </div>
        </div>
    );
}
