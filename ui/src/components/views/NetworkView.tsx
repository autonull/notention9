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

    // Derive top-level categories from ontology
    const rootCategories = useMemo(() => {
        return settings.ontology || [];
    }, [settings.ontology]);

    const filteredEvents = useMemo(() => {
        if (activeFilterId === 'all') return sortedEvents;

        const ontology = settings.ontology ?? [];
        const selectedNode = findNode(ontology, activeFilterId);
        if (!selectedNode) return sortedEvents;

        const keysInBranch = getSubtreeKeys(selectedNode);

        return sortedEvents.filter(event => {
            const props = parseProperties(event.content);
            return props.some(p => keysInBranch.has(p.key));
        });
    }, [sortedEvents, activeFilterId, settings.ontology]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-[var(--app-line)] px-4 md:px-6">
                {pubkey ? (
                    <ProfileHeader
                        settings={settings}
                        pubkey={pubkey}
                        profileCache={profiles}
                    />
                ) : (
                    <ConnectIdentityPrompt onNavigateToSettings={onNavigateToSettings}/>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
                <NetworkFeedHeader
                    matchAgainstTitle={matchAgainst?.title}
                    onClearMatch={() => setMatchingNoteId(null)}
                    filter={filter}
                    setFilter={setFilter}
                    ontology={rootCategories}
                    activeFilterId={activeFilterId}
                    setActiveFilterId={setActiveFilterId}
                />

                {!matchAgainst && !filter && activeFilterId === 'all' && <SuggestedMatches/>}

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
