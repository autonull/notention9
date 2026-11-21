import React, {useState, useEffect, useMemo} from 'react';
import {Button} from '../ui/Button';
import {CheckCircleIcon, XCircleIcon, MinusIcon, InformationCircleIcon, ArrowPathIcon, PencilIcon, XMarkIcon, ThumbsUpIcon, ThumbsDownIcon, EditIcon, MapIcon, ChartBarIcon} from '../ui/icons';
import type {MatchResult, PropertyMatch, Property, Note, MatchDetails} from '@notention/core';
import {recordFriction} from '@notention/core/telemetry/journal';
import {getEffectiveCrossKeyMap} from '@notention/core';
import type {AppSettings} from '@notention/core';

interface LocalMatchPreviewProps {
    match: {
        request: {id: string; title: string};
        note: {id: string; title: string};
        result: MatchResult;
    };
    onSelectNote: (id: string) => void;
    onAcceptMatch: (requestId: string, noteId: string, score: number) => void;
    onRejectMatch?: (requestId: string, noteId: string) => void;
    onReviseRequest?: (requestId: string) => void;
    onView?: () => void;
    onExplanation?: (event: 'explained' | 'dismissed') => void;
    settings?: Partial<AppSettings>;
}

function getMatchTypeColor(details?: MatchDetails) {
    if (!details) return 'text-gray-400';
    switch (details.type) {
        case 'exact': return 'text-green-400';
        case 'alias': return 'text-blue-400';
        case 'fuzzy': return 'text-yellow-400';
        case 'range': return 'text-purple-400';
        case 'partial': return 'text-orange-400';
        case 'geo': return 'text-cyan-400';
        case 'date': return 'text-pink-400';
        default: return 'text-gray-400';
    }
}

function getMatchTypeLabel(details?: MatchDetails) {
    if (!details) return 'Matched';
    switch (details.type) {
        case 'exact': return 'Exact match';
        case 'alias': return 'Alias match';
        case 'fuzzy': return 'Fuzzy match';
        case 'range': return 'Range match';
        case 'partial': return 'Partial match';
        case 'geo': return 'Geographic match';
        case 'date': return 'Date match';
        default: return 'Matched';
    }
}

/** Build detailed explanation for a match including cross-key mappings and score contribution */
function buildMatchExplanation(m: PropertyMatch, settings?: Partial<AppSettings>): {
    crossKeyUsed: boolean;
    mappedFrom: string | null;
    scoreContribution: string;
} {
    const requestKey = m.requestProp.key;
    const offerKey = m.offerProp.key;
    const crossKeyMap = getEffectiveCrossKeyMap(settings);
    const mappedFrom = crossKeyMap[requestKey]?.includes(offerKey) 
        ? `mapped from request "${requestKey}" → offer "${offerKey}"`
        : null;
    
    return {
        crossKeyUsed: !!mappedFrom,
        mappedFrom,
        scoreContribution: `${Math.round(m.compatibility * 100)}%`,
    };
}

export function LocalMatchPreview({match, onSelectNote, onAcceptMatch, onRejectMatch, onReviseRequest, onView, onExplanation, settings}: LocalMatchPreviewProps) {
    const {result} = match;
    const totalMatches = result.matches.length;
    const totalConflicts = result.conflicts.length;
    const totalMissing = result.missing.length;
    
    const crossKeyMap = getEffectiveCrossKeyMap(settings);
    const hasExplanations = result.matches.some(m => m.details) || 
                           result.conflicts.some(c => c.details) ||
                           totalMissing > 0;
    
    const [showRecovery, setShowRecovery] = useState(false);
    const [explanationsOpen, setExplanationsOpen] = useState(false);

    // Track match_viewed on mount
    useEffect(() => {
        onView?.();
    }, [onView]);

    // The explanation is the honesty surface: opening it is a signal, and
    // closing it again without acting is a different one.
    const handleExplanationToggle = (open: boolean) => {
        setExplanationsOpen(open);
        onExplanation?.(open ? 'explained' : 'dismissed');
    };

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
                    <div className="text-3xl font-bold text-green-300">{Math.round(result.score * 100)}%</div>
                    <div className="text-xs text-gray-500">
                        {totalMatches} satisfied · {totalConflicts} conflicting · {totalMissing} missing
                    </div>
                    
                    {hasExplanations && (
                        <details
                            className="mt-4 text-left md:text-left"
                            data-testid="match-explanations"
                            onToggle={(e) => handleExplanationToggle(e.currentTarget.open)}
                        >
                            <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200">
                                <InformationCircleIcon className="w-4 h-4 flex-shrink-0"/>
                                Why this match?
                            </summary>
                            <div className="mt-3 space-y-4 text-xs">
                                {/* Cross-key mappings used */}
                                {result.matches.some(m => crossKeyMap[m.requestProp.key]?.includes(m.offerProp.key)) && (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wide mb-2">
                                            <MapIcon className="w-3 h-3"/> Cross-key mappings used
                                        </div>
                                        <div className="space-y-1 text-blue-300">
                                            {result.matches
                                                .filter(m => crossKeyMap[m.requestProp.key]?.includes(m.offerProp.key))
                                                .map((m, i) => (
                                                    <div key={i} className="text-[11px]">
                                                        <span className="font-medium">{m.requestProp.key}</span>
                                                        <span className="text-gray-500"> → </span>
                                                        <span className="font-medium">{m.offerProp.key}</span>
                                                        <span className="text-gray-500"> (</span>
                                                        <span className="text-gray-400">{m.requestProp.operator} {m.requestProp.values.join(', ')}</span>
                                                        <span className="text-gray-500"> matched to </span>
                                                        <span className="text-gray-400">{m.offerProp.operator} {m.offerProp.values.join(', ')}</span>
                                                        <span className="text-gray-500">)</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Score breakdown */}
                                {result.matches.length > 0 && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wide mb-2">
                                            <ChartBarIcon className="w-3 h-3"/> Score breakdown
                                        </div>
                                        <div className="space-y-1 text-green-300">
                                            {result.matches.map((m, i) => {
                                                const explanation = buildMatchExplanation(m, settings);
                                                return (
                                                    <div key={i} className="flex items-center justify-between text-[11px]">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{m.requestProp.key}</span>
                                                            <span className="text-gray-500">{m.requestProp.operator}</span>
                                                            <span className="text-gray-400">{m.requestProp.values.join(', ')}</span>
                                                            {explanation.crossKeyUsed && (
                                                                <span className="text-blue-400 text-[10px]">via cross-key</span>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-green-400">{explanation.scoreContribution}</span>
                                                    </div>
                                                );
                                            })}
                                            <div className="border-t border-green-500/20 pt-1 flex items-center justify-between text-xs">
                                                <span className="font-bold">Total match score</span>
                                                <span className="font-mono font-bold text-green-300">{Math.round(result.score * 100)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Matches */}
                                {result.matches.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Why it fits</div>
                                        <div className="space-y-1">
                                            {result.matches.map((m, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                                                    <CheckCircleIcon className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5"/>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white">
                                                            <span className="font-medium">{m.requestProp.key}</span>
                                                            <span className="text-gray-500"> {m.requestProp.operator} </span>
                                                            <span className="text-gray-300">{m.requestProp.values.join(', ')}</span>
                                                            {m.requestProp.unit && (
                                                                <span className="text-gray-400 font-mono text-[11px]"> {m.requestProp.unit}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-mono ${getMatchTypeColor(m.details)}`}>
                                                                {m.details ? getMatchTypeLabel(m.details) : 'Matched'}
                                                            </span>
                                                            {m.reason && (
                                                                <span className="text-gray-500 text-[10px]">{m.reason}</span>
                                                            )}
                                                            {m.details?.aliasUsed && (
                                                                <span className="text-blue-400 text-[10px]">via alias: {m.details.aliasUsed}</span>
                                                            )}
                                                            {m.details?.valueMatch && (
                                                                <span className="text-gray-400 text-[10px]">value: {m.details.valueMatch}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {result.conflicts.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Conflicts</div>
                                        <div className="space-y-1">
                                            {result.conflicts.map((c, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                                                    <XCircleIcon className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5"/>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white">
                                                            <span className="font-medium">{c.requestProp.key}</span>
                                                            <span className="text-gray-500"> {c.requestProp.operator} </span>
                                                            <span className="text-gray-300">{c.requestProp.values.join(', ')}</span>
                                                            {c.requestProp.unit && (
                                                                <span className="text-gray-400 font-mono text-[11px]"> {c.requestProp.unit}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-red-300 text-[10px] mt-1">{c.reason}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {totalMissing > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-2">Missing details</div>
                                        <div className="space-y-1">
                                            {result.missing.map((m, i) => (
                                                <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                                                    <MinusIcon className="w-3 h-3 text-yellow-400 flex-shrink-0"/>
                                                    <div className="text-white">
                                                        <span className="font-medium">{m.key}</span>
                                                        <span className="text-gray-500"> {m.operator} </span>
                                                        <span className="text-gray-300">{m.values.join(', ')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                    
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
                        <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                                recordFriction({ workflow: 'match', seam: 'local-match', kind: 'match_accepted', count: 1, noteId: match.note.id });
                                onAcceptMatch(match.request.id, match.note.id, match.result.score);
                            }}
                        >
                            <CheckCircleIcon className="w-4 h-4 mr-1"/> Respond
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                recordFriction({ workflow: 'match', seam: 'local-match', kind: 'match_rejected', count: 1, noteId: match.note.id });
                                setShowRecovery(true);
                            }}
                            className="text-yellow-400 hover:text-yellow-300"
                            title="This match isn't right - help me correct it"
                        >
                            <XMarkIcon className="w-4 h-4 mr-1"/> Not a match
                        </Button>
                    </div>
                    
                    {showRecovery && onRejectMatch && onReviseRequest && (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl animate-slide-in-down">
                            <div className="text-xs text-yellow-300 mb-2">This match isn't right. What would you like to do?</div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        recordFriction({ workflow: 'match', seam: 'local-match', kind: 'match_rejected', count: 1, noteId: match.note.id });
                                        onRejectMatch(match.request.id, match.note.id);
                                        setShowRecovery(false);
                                    }}
                                >
                                    <XMarkIcon className="w-3 h-3 mr-1"/> Reject this match
                                </Button>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => {
                                        recordFriction({ workflow: 'match', seam: 'local-match', kind: 'clarification_requested', count: 1, noteId: match.request.id });
                                        onReviseRequest(match.request.id);
                                        setShowRecovery(false);
                                    }}
                                >
                                    <PencilIcon className="w-3 h-3 mr-1"/> Revise request
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowRecovery(false)}
                                >
                                    <ArrowPathIcon className="w-3 h-3 mr-1"/> Try different match
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}