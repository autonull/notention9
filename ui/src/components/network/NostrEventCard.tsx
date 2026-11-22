import React, {useMemo} from 'react';
import {nip19} from 'nostr-tools';

import {useView} from '../../hooks/useViewContext';
import type {NostrEvent, NostrProfile} from '@notention/core';
import {extractPropertiesFromTags, formatNpub} from '@notention/core';
import {ChatIcon, DocumentDuplicateIcon, MergeIcon} from '../ui/icons';
import {Avatar} from '../ui/Avatar';
import {Button} from '../ui/Button';
import {Chip} from '../ui/kit';
import {FeedRow} from '../patterns/FeedRow';

// Extend NostrEvent to include a relevance value if available
export type ScoredNostrEvent = NostrEvent & { score?: number };

interface NostrEventCardProps {
    event: ScoredNostrEvent;
    profile: NostrProfile | undefined;
    onApplyMatch?: (event: ScoredNostrEvent) => void;
    onFork?: () => void;
}

const MAX_CHIPS = 4;

export function NostrEventCard({
                                   event,
                                   profile,
                                   onApplyMatch,
                                   onFork,
                               }: NostrEventCardProps) {
    const {setActiveView, setSelectedChatPubkey} = useView();

    const eventDate = new Date(event.created_at * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
    const authorNpub = useMemo(
        () => nip19.npubEncode(event.pubkey),
        [event.pubkey]
    );

    const matchScore = event.score;
    const properties = extractPropertiesFromTags(event.tags);
    const hashtags = event.tags.filter(t => t[0] === 't').map(t => t[1]);
    const chipCount = properties.length + hashtags.length;

    const handleChat = () => {
        setSelectedChatPubkey(event.pubkey);
        setActiveView('notes');
    };

    return (
        <FeedRow
            leading={<Avatar src={profile?.picture} pubkey={event.pubkey} size="sm"/>}
            title={profile?.name || formatNpub(authorNpub)}
            meta={
                <>
                    {matchScore !== undefined && (
                        <Chip tone={matchScore > 80 ? 'success' : matchScore > 50 ? 'warning' : 'neutral'} size="xs">
                            {Math.round(matchScore)}%
                        </Chip>
                    )}
                    <span title={eventDate}>{eventDate}</span>
                </>
            }
            body={<span className="line-clamp-6">{event.content}</span>}
            chips={
                chipCount > 0 ? (
                    <>
                        {properties.slice(0, MAX_CHIPS).map(prop => (
                            <Chip key={prop.key} size="xs">
                                <span className="text-[var(--app-text-secondary)]">{prop.key}</span>
                                <span className="text-[var(--app-faint)]">{prop.operator === 'is' ? '=' : prop.operator}</span>
                                <span className="max-w-40 truncate text-[var(--app-muted)]">{prop.values.join(', ')}</span>
                            </Chip>
                        ))}
                        {hashtags.slice(0, Math.max(0, MAX_CHIPS - properties.length)).map(tag => (
                            <Chip key={tag} size="xs">#{tag}</Chip>
                        ))}
                        {chipCount > MAX_CHIPS && <span className="text-[11px] text-[var(--app-faint)]">+{chipCount - MAX_CHIPS}</span>}
                    </>
                ) : undefined
            }
            actions={
                <>
                    {onApplyMatch && properties.length > 0 && (
                        <Button
                            onClick={() => onApplyMatch(event)}
                            variant="ghost"
                            size="xs"
                            icon={MergeIcon}
                            title="Apply these details to your note"
                        >
                            Apply match
                        </Button>
                    )}
                    {onFork && (
                        <Button
                            onClick={onFork}
                            variant="ghost"
                            size="xs"
                            icon={DocumentDuplicateIcon}
                            title="Fork this note to your collection"
                        >
                            Fork
                        </Button>
                    )}
                    <Button
                        onClick={handleChat}
                        variant="ghost"
                        size="xs"
                        icon={ChatIcon}
                    >
                        Chat
                    </Button>
                </>
            }
        />
    );
}
