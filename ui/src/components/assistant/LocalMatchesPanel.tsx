import { MatchList } from '../match/MatchList';
import { ScoredMatch, Contact } from '@notention/core';

interface LocalMatchesPanelProps {
    localMatches: ScoredMatch[];
    contacts: Contact[];
    onSelect: (match: ScoredMatch) => void;
}

export function LocalMatchesPanel({
    localMatches,
    contacts,
    onSelect
}: LocalMatchesPanelProps) {
    if (localMatches.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-gray-500 italic">
                No local matches found.
            </div>
        );
    }

    return (
        <MatchList
            matches={localMatches}
            isLocal={true}
            contacts={contacts}
            onSelect={onSelect}
        />
    );
}