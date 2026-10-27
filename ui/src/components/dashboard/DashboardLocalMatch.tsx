import React, {useCallback, useMemo} from 'react';
import type {Note} from '@notention/core';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {MatchEngine} from '@notention/core';
import {Button} from '../ui';
import {CheckCircleIcon} from '../ui/icons';
import {cn} from '../../utils/ui';

interface DashboardLocalMatchProps {
    notes: Note[];
    onSelectNote: (id: string) => void;
}

export function DashboardLocalMatch({notes, onSelectNote}: DashboardLocalMatchProps) {
    const {settings} = useSettings();

    const localMatch = useMemo(() => {
        if (notes.length < 2) return null;
        const engine = new MatchEngine(settings.ontology || []);
        return notes
            .filter(note => note.properties.some(p => p.key === 'intent' && p.values.includes('request')))
            .flatMap(request =>
                notes
                    .filter(note => note.id !== request.id)
                    .map(note => ({request, note, result: engine.calculateMatchScore(request, note)}))
            )
            .filter(match => match.result.score > 0.4)
            .sort((a, b) => b.result.score - a.result.score)[0] ?? null;
    }, [notes, settings.ontology]);

    if (!localMatch) return null;

    return (
        <section className="rounded-3xl border border-green-500/20 bg-green-500/5 p-6 animate-slide-in-up stagger-2" data-testid="local-match">
            <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-widest mb-4">
                <CheckCircleIcon className="w-4 h-4"/> Match found locally
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                    <div className="text-sm text-gray-400 truncate">{localMatch.request.title}</div>
                    <div className="text-gray-500 text-xs my-1">matches</div>
                    <div className="font-semibold text-white truncate">{localMatch.note.title}</div>
                </div>
                <div className="text-center md:text-right flex-shrink-0">
                    <div className="text-3xl font-bold text-green-300">{Math.round(localMatch.result.score * 100)}%</div>
                    <div className="text-xs text-gray-500">{localMatch.result.matches.length} satisfied · {localMatch.result.conflicts.length} conflicting</div>
                    <div className="mt-3 flex flex-wrap justify-center md:justify-end gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onSelectNote(localMatch.request.id)}
                        >
                            Open request
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onSelectNote(localMatch.note.id)}
                        >
                            Open match
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}