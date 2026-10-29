import React, {useState} from 'react';
import {Button} from '../ui/Button';
import {CheckCircleIcon, XCircleIcon, MinusIcon, InformationCircleIcon, ArrowPathIcon, PencilIcon, XMarkIcon} from '../ui/icons';
import type {MatchResult, PropertyMatch, Property, Note} from '@notention/core';

interface LocalMatchPreviewProps {
    match: {
        request: {id: string; title: string};
        note: {id: string; title: string};
        result: MatchResult;
    };
    onSelectNote: (id: string) => void;
    onRejectMatch?: (requestId: string, noteId: string) => void;
    onReviseRequest?: (requestId: string) => void;
}

function getMatchTypeColor(type: PropertyMatch['details']['type']) {
    switch (type) {
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

function getMatchTypeLabel(type: PropertyMatch['details']['type']) {
    switch (type) {
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

export function LocalMatchPreview({match, onSelectNote, onRejectMatch, onReviseRequest}: LocalMatchPreviewProps) {
    const {result} = match;
    const totalMatches = result.matches.length;
    const totalConflicts = result.conflicts.length;
    const totalMissing = result.missing.length;
    
    const hasExplanations = result.matches.some(m => m.details) || 
                           result.conflicts.some(c => c.details) ||
                           totalMissing > 0;
    
    const [showRecovery, setShowRecovery] = useState(false);

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
                        <details className="mt-4 text-left md:text-left" data-testid="match-explanations">
                            <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200">
                                <InformationCircleIcon className="w-4 h-4 flex-shrink-0"/>
                                Show details
                            </summary>
                            <div className="mt-3 space-y-3 text-xs">
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
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-mono ${getMatchTypeColor(m.details?.type)}`}>
                                                                {m.details?.type ? getMatchTypeLabel(m.details.type) : 'Matched'}
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
                            variant="ghost"
                            onClick={() => setShowRecovery(true)}
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