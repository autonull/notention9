import React from 'react';
import {Button} from '../ui/Primitives';
import {CheckCircleIcon} from '../common/icons';
import type {MatchResult, PropertyMatch} from '@notention/core';

interface LocalMatchPreviewProps {
    match: {
        request: {id: string; title: string};
        note: {id: string; title: string};
        result: MatchResult;
    };
    onSelectNote: (id: string) => void;
}

export function LocalMatchPreview({match, onSelectNote}: LocalMatchPreviewProps) {
    return (
        <section className="rounded-3xl border border-green-500/20 bg-green-500/5 p-6 animate-slide-in-up stagger-2" data-testid="local-match">
            <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-widest mb-4">
                <CheckCircleIcon className="w-4 h-4"/> Match found locally
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                    <div className="text-sm text-gray-400 truncate">{match.request.title}</div>
                    <div className="text-gray-500 text-xs my-1">matches</div>
                    <div className="font-semibold text-white truncate">{match.note.title}</div>
                </div>
                <div className="text-center md:text-right flex-shrink-0">
                    <div className="text-3xl font-bold text-green-300">{Math.round(match.result.score * 100)}%</div>
                    <div className="text-xs text-gray-500">{match.result.matches.length} satisfied · {match.result.conflicts.length} conflicting</div>
                    <div className="mt-3 flex flex-wrap justify-center md:justify-end gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onSelectNote(match.request.id)}
                        >
                            Open request
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onSelectNote(match.note.id)}
                        >
                            Open match
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}