import React from 'react';

import { useNetworkView } from '../../hooks/useNetworkView';
import type { Note } from '@notention/core';
import { ProfileHeader } from '../network/ProfileHeader';
import { ConnectIdentityPrompt } from '../network/ConnectIdentityPrompt';
import { NetworkFeedHeader } from '../network/NetworkFeedHeader';
import { SuggestedMatches } from '../network/SuggestedMatches';
import { NetworkFeedList } from '../network/NetworkFeedList';

interface NetworkViewProps {
  matchAgainst?: Note | null;
}

import { useState, useMemo } from 'react';
import { getSubtreeKeys, findNode } from '@notention/core';
import { parseProperties } from '@notention/core';

export function NetworkView({ matchAgainst }: NetworkViewProps) {
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
  } = useNetworkView({ matchAgainst });

  const [activeFilterId, setActiveFilterId] = useState<string>('all');

  // Derive top-level categories from ontology
  const rootCategories = useMemo(() => {
      return settings.ontology || [];
  }, [settings.ontology]);

  const filteredEvents = useMemo(() => {
      if (activeFilterId === 'all') return sortedEvents;

      const selectedNode = findNode(settings.ontology, activeFilterId);
      if (!selectedNode) return sortedEvents;

      const keysInBranch = getSubtreeKeys(selectedNode);

      return sortedEvents.filter(event => {
          // Parse properties from content (since they might not be in tags)
          // Optimization: Check for presence of key strings first before full parse?
          // Full parse is safer.
          const props = parseProperties(event.content);

          // Also check explicit tags if we store them there in future
          // Check if any property key exists in the branch
          return props.some(p => keysInBranch.has(p.key));
      });
  }, [sortedEvents, activeFilterId, settings.ontology]);

  if (!pubkey) {
    return <ConnectIdentityPrompt onNavigateToSettings={onNavigateToSettings} />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-800/50 rounded-lg overflow-hidden">
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
            sortedEvents={sortedEvents}
            ontology={rootCategories}
            activeFilterId={activeFilterId}
            setActiveFilterId={setActiveFilterId}
        />

        {!matchAgainst && !filter && activeFilterId === 'all' && <SuggestedMatches />}

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
