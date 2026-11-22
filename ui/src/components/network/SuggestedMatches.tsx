import React from 'react';
import {SparklesIcon} from '../ui/icons';
import {useView} from '../../hooks/useViewContext';
import {SuggestedMatchItem} from './SuggestedMatchItem';

export function SuggestedMatches() {
    const {matches, setMatchingNoteId} = useView();

    if (matches.length === 0) return null;

    return (
        <section className="mb-3" aria-label="Suggested matches">
            <h2 className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--app-faint)]">
                <SparklesIcon className="h-3.5 w-3.5"/>
                Suggested matches
            </h2>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                {matches.slice(0, 4).map(match => (
                    <SuggestedMatchItem
                        key={`${match.localNoteId}-${match.event.id}`}
                        match={match}
                        onSelect={setMatchingNoteId}
                    />
                ))}
            </div>
        </section>
    );
}
