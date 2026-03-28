import React, {useMemo} from 'react';
import {nip19} from 'nostr-tools';

import {useView} from '../../hooks/useViewContext';
import type {NostrEvent, NostrProfile} from '@notention/core';
import {extractPropertiesFromTags, formatNpub} from '@notention/core';
import {ChatIcon, DocumentDuplicateIcon, MergeIcon} from '../common/icons';
import {Avatar} from '../common/Avatar';
import {Button} from '../common/Button';

// Extend NostrEvent to include score if available
export type ScoredNostrEvent = NostrEvent & { score?: number };

interface NostrEventCardProps {
    event: ScoredNostrEvent;
    profile: NostrProfile | undefined;
    onApplyMatch?: (event: ScoredNostrEvent) => void;
    onFork?: () => void;
}

export function NostrEventCard({
                                   event,
                                   profile,
                                   onApplyMatch,
                                   onFork,
                               }: NostrEventCardProps) {
    const {setActiveView, setSelectedChatPubkey} = useView();

    const eventDate = new Date(event.created_at * 1000).toLocaleString();
    const authorNpub = useMemo(
        () => nip19.npubEncode(event.pubkey),
        [event.pubkey]
    );

    const matchScore = event.score;

    const handleChat = () => {
        setSelectedChatPubkey(event.pubkey);
        setActiveView('chat');
    };

    const properties = extractPropertiesFromTags(event.tags);
    const hashtags = event.tags.filter(t => t[0] === 't').map(t => t[1]);

    return (
        <div
            className="bg-[#1e293b] rounded-xl border border-gray-700/50 animate-fade-in relative overflow-hidden group hover:border-[#3b82f6]/50 transition-colors">

            <div className="p-5">
                {/* Header Row: Title/Author and Stats */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar
                            src={profile?.picture}
                            pubkey={event.pubkey}
                            size="sm"
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span title="Published" className="text-xs">🌐</span>
                                <div
                                    className="font-bold text-white text-base truncate cursor-pointer hover:text-blue-400 transition-colors"
                                    title={authorNpub}
                                >
                                    {profile?.name || formatNpub(authorNpub)}
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">Posted {eventDate}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {matchScore !== undefined && (
                            <div className="flex items-center gap-1 text-sm font-bold text-[#f59e0b]">
                                <span>⭐</span>
                                <span>{Math.round(matchScore)}%</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-400" title="Connections">
                            <span>🔁</span>
                            <span>{(parseInt(event.id.substring(0, 4), 16) % 5) + 1}</span>
                        </div>
                    </div>
                </div>

                {/* Semantic Properties Inline Highlight */}
                {properties.length > 0 && (
                    <div className="mb-3 text-sm text-gray-300">
                        {properties.map((prop, idx) => {
                            let icon = '🏷️';
                            if (prop.key.match(/role|job|skill/i)) icon = '💼';
                            else if (prop.key.match(/budget|price/i)) icon = '💰';
                            else if (prop.key.match(/location|city/i)) icon = '📍';

                            return (
                                <React.Fragment key={idx}>
                                    <span className="font-medium text-blue-200">{icon} {prop.values.join(', ')}</span>
                                    {idx < properties.length - 1 && <span className="mx-2 text-gray-600">•</span>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Content Snippet */}
                <div className="text-gray-400 text-sm whitespace-pre-wrap break-words mb-5 line-clamp-3 italic">
                    "{event.content.substring(0, 150)}{event.content.length > 150 ? '...' : ''}"
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onFork}
                        className="px-4 py-1.5 text-xs font-medium rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors"
                    >
                        [View]
                    </button>
                    <button
                        onClick={handleChat}
                        className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-900/50 transition-colors"
                    >
                        [Start Chat]
                    </button>
                    {onApplyMatch && properties.length > 0 && (
                        <button
                            onClick={() => onApplyMatch(event)}
                            className="px-4 py-1.5 text-xs font-medium rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors"
                        >
                            [Import as Note]
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
