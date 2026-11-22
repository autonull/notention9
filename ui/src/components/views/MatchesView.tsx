import React, {useMemo} from 'react';
import type {Note} from '@notention/core';
import {MatchEngine} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {EmptyState} from '../ui/Primitives';
import {PinIcon} from '../ui/icons';

interface LocalPair {
    request: Note;
    offer: Note;
    score: number;
    satisfied: number;
    conflicting: number;
}

const isRequest = (note: Note): boolean =>
    note.properties.some(p => p.key === 'intent' && p.values.includes('request')) ||
    note.tags.includes('request') ||
    note.properties.some(p => p.operator !== 'is');

const isOffer = (note: Note): boolean =>
    note.properties.some(p => p.key === 'intent' && p.values.includes('offer')) ||
    note.tags.includes('offer') ||
    note.properties.some(p => p.key === 'type' && p.values.some(value => value.includes('offer')));

export function MatchesView() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const {setSelectedNoteId, setActiveView} = useView();

    const pairs = useMemo<LocalPair[]>(() => {
        const engine = new MatchEngine(settings.ontology ?? []);
        const requests = notes.filter(isRequest);
        const offers = notes.filter(isOffer);

        return requests
            .flatMap(request => offers
                .filter(offer => offer.id !== request.id)
                .map(offer => {
                    const result = engine.calculateMatchScore(request, offer);
                    return {
                        request,
                        offer,
                        score: result.score,
                        satisfied: result.matches.length,
                        conflicting: result.conflicts.length,
                    };
                }))
            .filter(pair => pair.score >= 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
    }, [notes, settings.ontology]);

    const open = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    if (pairs.length === 0) {
        return (
            <EmptyState
                variant="minimal"
                title="No local matches yet"
                description="Add a request and an offer with overlapping details. Matching runs on this device."
                action={<PinIcon className="w-12 h-12 text-gray-600"/>}
            />
        );
    }

    return (
        <div className="space-y-3" data-testid="matches-list">
            <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-gray-200">Local matches</h2>
                <span className="text-xs text-gray-500">{pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}</span>
            </div>
            {pairs.map(({request, offer, score, satisfied, conflicting}) => (
                <article
                    key={`${request.id}-${offer.id}`}
                    className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <button
                                type="button"
                                onClick={() => open(request.id)}
                                className="block w-full text-left group"
                            >
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Request</span>
                                <span className="block text-sm font-medium text-gray-200 truncate group-hover:text-white">
                                    {request.title || 'Untitled request'}
                                </span>
                            </button>
                            <div className="text-[11px] text-gray-600 my-1.5">matches</div>
                            <button
                                type="button"
                                onClick={() => open(offer.id)}
                                className="block w-full text-left group"
                            >
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Offer</span>
                                <span className="block text-sm font-medium text-gray-200 truncate group-hover:text-white">
                                    {offer.title || 'Untitled offer'}
                                </span>
                            </button>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-semibold text-green-400 tabular-nums">
                                {Math.round(score * 100)}%
                            </div>
                            <div className="text-[11px] text-gray-500">
                                {satisfied} satisfied · {conflicting} conflicting
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => open(request.id)}
                            className="px-2.5 py-1 rounded-md border border-gray-700 text-xs text-gray-300 hover:bg-gray-800"
                        >
                            Open request
                        </button>
                        <button
                            type="button"
                            onClick={() => open(offer.id)}
                            className="px-2.5 py-1 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-500"
                        >
                            Open offer
                        </button>
                    </div>
                </article>
            ))}
        </div>
    );
}
