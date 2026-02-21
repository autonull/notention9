import React from 'react';
import { ScoredMatch, Contact } from '@notention/core';
import { MatchItem } from './MatchItem';

interface MatchListProps {
    matches: ScoredMatch[];
    isLocal: boolean;
    contacts: Contact[];
    onConnect?: (match: ScoredMatch) => void;
    onChat?: (pubkey: string) => void;
    onSelect?: (match: ScoredMatch) => void;
}

export const MatchList: React.FC<MatchListProps> = ({
    matches,
    isLocal,
    contacts,
    onConnect,
    onChat,
    onSelect
}) => {
    if (!matches || matches.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2 pb-2">
            {matches.map((match) => {
                const isContact = !!(match.note.author && contacts.some(c => c.pubkey === match.note.author));

                return (
                    <MatchItem
                        key={match.note.id}
                        match={match}
                        isLocal={isLocal}
                        isContact={isContact}
                        onClick={() => onSelect?.(match)}
                        onConnect={() => onConnect?.(match)}
                        onChat={() => match.note.author && onChat?.(match.note.author)}
                    />
                );
            })}
        </div>
    );
};
