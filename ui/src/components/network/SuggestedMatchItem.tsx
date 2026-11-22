import React from 'react';
import {getTextFromHtml, type NostrEvent} from '@notention/core';
import {SparklesIcon} from '../ui/icons';
import {Chip} from '../ui/kit';
import {FeedRow} from '../patterns/FeedRow';

export interface SuggestionMatch {
    localNoteId: string;
    event: NostrEvent;
    score: number;
}

interface SuggestedMatchItemProps {
    match: SuggestionMatch;
    onSelect: (noteId: string) => void;
}

export function SuggestedMatchItem({match, onSelect}: SuggestedMatchItemProps) {
    const label = getTextFromHtml(match.event.content).slice(0, 60) || 'Untitled note';

    return (
        <FeedRow
            leading={<SparklesIcon className="mt-1 h-3.5 w-3.5 text-[var(--app-faint)]"/>}
            title={label}
            meta={<Chip tone="accent" size="xs">{Math.round(match.score * 100)}%</Chip>}
            onSelect={() => onSelect(match.localNoteId)}
        />
    );
}
