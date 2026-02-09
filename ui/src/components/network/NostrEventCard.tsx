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
            className="bg-gray-800 rounded-lg border border-gray-700/80 animate-fade-in relative overflow-hidden group hover:border-blue-500/30 transition-colors">

            {/* Match Score Badge */}
            {matchScore !== undefined && (
                <div
                    className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg shadow-sm z-10 ${
                        matchScore > 80
                            ? 'bg-green-600 text-white'
                            : matchScore > 50
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-600 text-gray-200'
                    }`}
                >
                    {Math.round(matchScore)}% Match
                </div>
            )}

            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <Avatar
                        src={profile?.picture}
                        pubkey={event.pubkey}
                        size="sm"
                    />
                    <div className="min-w-0">
                        <div
                            className="font-semibold text-white truncate hover:underline cursor-pointer"
                            title={authorNpub}
                        >
                            {profile?.name || formatNpub(authorNpub)}
                        </div>
                        <div className="text-xs text-gray-500">{eventDate}</div>
                    </div>
                </div>

                {/* Content */}
                <div className="text-gray-300 text-sm whitespace-pre-wrap break-words mb-4 line-clamp-6">
                    {event.content}
                </div>

                {/* Semantic Properties */}
                {properties.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {properties.map((prop, idx) => (
                            <div key={idx}
                                 className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-blue-900/30 text-blue-300 border border-blue-900/50">
                                <span className="font-bold">{prop.key}</span>
                                <span className="opacity-70">{prop.operator === 'is' ? ':' : prop.operator}</span>
                                <span className="text-white">{prop.values.join(', ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hashtags */}
                {hashtags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-400">
                        {hashtags.map((tag, idx) => (
                            <span key={idx} className="hover:text-blue-400 cursor-pointer">#{tag}</span>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div
                    className="flex justify-end gap-2 pt-3 border-t border-gray-700/50 opacity-100 md:opacity-80 group-hover:opacity-100 transition-all">
                    {onApplyMatch && properties.length > 0 && (
                        <Button
                            onClick={() => onApplyMatch(event)}
                            variant="secondary"
                            size="xs"
                            icon={MergeIcon}
                            className="hover:bg-purple-600 hover:text-white"
                            title="Apply semantic properties to your note"
                        >
                            Apply Match
                        </Button>
                    )}
                    {onFork && (
                        <Button
                            onClick={onFork}
                            variant="secondary"
                            size="xs"
                            icon={DocumentDuplicateIcon}
                            className="hover:bg-green-600 hover:text-white"
                            title="Fork this note to your collection"
                        >
                            Fork
                        </Button>
                    )}
                    <Button
                        onClick={handleChat}
                        variant="secondary"
                        size="xs"
                        icon={ChatIcon}
                        className="hover:bg-blue-600 hover:text-white"
                    >
                        Chat
                    </Button>
                </div>
            </div>
        </div>
    );
}
