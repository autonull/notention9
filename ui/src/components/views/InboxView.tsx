import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    createResponseNote,
    findLocalMatchesEnhanced,
    getTextFromHtml,
    logMatchAccepted,
    logMatchRejected,
    MatchEngine,
    type Note,
    recordMatchFeedback,
    getEffectiveCrossKeyMap,
} from '@notention/core';
import type { AppSettings } from '@notention/core';
import {
    recordMatchAccepted,
    recordMatchDismissed,
    recordNewMatch,
} from '@notention/core/telemetry/matchDigest';

import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {NoteListItem} from '../sidebar/NoteListItem';
import {EmptyState, NotesEmptyIllustration} from '../ui/Primitives';
import {Skeleton} from '../ui/Skeleton';
import {CheckCircleIcon, InformationCircleIcon, MapIcon, ChartBarIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {useCaptureTracking, useMatchTracking} from '../../hooks/useFrictionRecorder';
import {useRejectedMatches} from '../../hooks/useRejectedMatches';
import {useSeamStrategy} from '../../hooks/useStrategyResolver';
import {StrategyResolver, SEAM_ROLES} from '../StrategyResolver';
import {AutomationsView} from '../dashboard/AutomationsView';
import {sanitizeHTML} from '../../utils/sanitize';
import {useHeuristicExtraction} from '../../hooks/useExtraction';

interface InboxViewProps {
    sortedNotes?: Note[];
}

const QUICK_CAPTURE_MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

const deriveQuickNoteTitle = (input: string): string =>
    getTextFromHtml(input).replace(QUICK_CAPTURE_MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick Note';

const deriveQuickTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

const focusCapture = () =>
    document.querySelector<HTMLInputElement>('[data-testid="quick-capture-input"]')?.focus();

export function InboxView(_props: InboxViewProps) {
    const {notes, addNote, loading: notesLoading} = useNotes();
    const {setActiveView, selectedNoteId, setSelectedNoteId, searchTerm, sortOrder} = useView();
    const {settings} = useSettings();
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const [quickCaptureInput, setQuickCaptureInput] = useState('');

    const {startTracking: startCaptureTracking, stopTracking: stopCaptureTracking, markSubmitted: markCaptureSubmitted} = useCaptureTracking('capture', 'capture');
    const {
        markViewed: markMatchViewed,
        handleAccept: handleMatchAccept,
        handleReject: handleMatchReject,
        handleClarification: handleMatchClarification,
        handleExplained: handleMatchExplained,
        handleDismissed: handleMatchDismissed,
        recordResponseCreated,
    } = useMatchTracking('match', 'match');
    const {rejectMatch} = useRejectedMatches();

    const captureStrategy = useSeamStrategy(SEAM_ROLES.CAPTURE);
    const initialOp = (captureStrategy?.getDefaultProps() as {initialOp?: string} | undefined)?.initialOp ?? 'is';

    const extraction = useHeuristicExtraction(quickCaptureInput, settings.ontology ?? []);
    const [extractedProps, setExtractedProps] = useState<Array<{key: string; operator: string; values: string[]}>>([]);

    useEffect(() => {
        if (!quickCaptureInput.trim()) {
            setExtractedProps([]);
            return;
        }
        let cancelled = false;
        extraction.extract().then(result => {
            if (!cancelled && result) {
                setExtractedProps(result.properties.map(p => ({key: p.key, operator: p.operator, values: p.values})));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [quickCaptureInput, extraction.extract]);

    useEffect(() => {
        const handlePasteToCapture = (event: CustomEvent<{text: string}>) => {
            setQuickCaptureInput(event.detail.text);
            setActiveView('inbox');
            requestAnimationFrame(focusCapture);
        };
        const handleFocusCapture = () => requestAnimationFrame(focusCapture);
        window.addEventListener('paste-to-capture', handlePasteToCapture as EventListener);
        window.addEventListener('focus-capture', handleFocusCapture);
        return () => {
            window.removeEventListener('paste-to-capture', handlePasteToCapture as EventListener);
            window.removeEventListener('focus-capture', handleFocusCapture);
        };
    }, [setActiveView]);

    const handleQuickCapture = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCaptureInput.trim()) return;

        markCaptureSubmitted();
        stopCaptureTracking(true);

        const note = addNote({
            title: deriveQuickNoteTitle(quickCaptureInput),
            content: sanitizeHTML(`<p>${quickCaptureInput}</p>`),
            tags: ['quick-capture', ...deriveQuickTags(quickCaptureInput)],
            properties: extractedProps.map(prop => ({...prop, operator: initialOp})),
        });

        setSelectedNoteId(note.id);
        setActiveView('notes');
        setQuickCaptureInput('');
    }, [quickCaptureInput, extractedProps, initialOp, addNote, setSelectedNoteId, setActiveView, markCaptureSubmitted, stopCaptureTracking]);

    const handleQuickTemplate = useCallback((type: 'task' | 'journal' | 'idea') => {
        const templates = {
            task: {
                title: 'New Task',
                content: '<p>Describe task...</p>',
                properties: [{key: 'status', operator: 'is', values: ['todo']}],
                tags: ['task'],
            },
            journal: {
                title: new Date().toLocaleDateString(),
                content: '<p>Thoughts...</p>',
                properties: [{key: 'type', operator: 'is', values: ['journal']}],
                tags: ['journal'],
            },
            idea: {
                title: 'New Idea',
                content: '<p>Idea description...</p>',
                properties: [{key: 'type', operator: 'is', values: ['idea']}],
                tags: ['idea'],
            },
        };
        const template = templates[type];

        markCaptureSubmitted();
        stopCaptureTracking(true);

        const note = addNote({
            title: template.title,
            content: template.content,
            tags: [...template.tags],
            properties: [...template.properties],
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView, markCaptureSubmitted, stopCaptureTracking]);

    const getSortedFilteredNotes = useMemo(() => {
        return (search: string, sort: string) => {
            let filtered = [...notes];

            if (search) {
                const lowerSearch = search.toLowerCase();
                filtered = filtered.filter(note =>
                    note.title.toLowerCase().includes(lowerSearch) ||
                    note.content.toLowerCase().includes(lowerSearch) ||
                    note.tags.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
                    note.properties.some(prop =>
                        prop.key.toLowerCase().includes(lowerSearch) ||
                        prop.values.some(v => v.toLowerCase().includes(lowerSearch))
                    )
                );
            }

            switch (sort) {
                case 'oldest':
                    filtered.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
                    break;
                case 'title':
                    filtered.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'created':
                    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.updatedAt).getTime());
                    break;
                case 'updated':
                default:
                    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    break;
            }

            return filtered;
        };
    }, [notes]);

    const filteredNotes = getSortedFilteredNotes(searchTerm, sortOrder);

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

    const localMatch = useMemo(() => {
        if (notes.length < 2) return null;
        const engine = new MatchEngine(settings.ontology || []);
        const requests = notes.filter(note => note.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        const offers = notes.filter(note => !note.properties.some(p => p.key === 'intent' && p.values.includes('request')));

        if (requests.length === 0 || offers.length === 0) return null;

        const matches = findLocalMatchesEnhanced(engine, requests[0], offers, {
            threshold: 0.4,
            ranking: {scoreWeight: 0.5, recencyWeight: 0.2, coverageWeight: 0.2, distanceWeight: 0.1},
            deduplicate: {similarityThreshold: 0.85},
            usePreferences: true,
            settings,
        });

        return matches[0] ? {request: requests[0], note: matches[0].note, result: matches[0].result} : null;
    }, [notes, settings.ontology]);

    useEffect(() => {
        if (localMatch && localMatch.result.score >= 0.4) {
            recordNewMatch(localMatch.request.id, localMatch.note.id, localMatch.result.score);
        }
    }, [localMatch]);

    const handleMatchViewed = useCallback(() => markMatchViewed(localMatch?.request.id), [markMatchViewed, localMatch?.request.id]);

    const handleAcceptMatch = useCallback((requestId: string, noteId: string, score: number) => {
        const request = notes.find(n => n.id === requestId);
        const offer = notes.find(n => n.id === noteId);
        if (!request || !offer) return;

        const responseNote = createResponseNote(request, offer, score);
        addNote(responseNote);
        logMatchAccepted(requestId, noteId, responseNote.id, score);

        // Record feedback for preference learning
        const engine = new MatchEngine(settings.ontology || []);
        const result = engine.calculateMatchScore(request, offer);
        const crossKeyMap = getEffectiveCrossKeyMap(settings);
        recordMatchFeedback('accept', request, offer, result, crossKeyMap);

        handleMatchAccept(requestId);
        recordResponseCreated(requestId);
        recordMatchAccepted(requestId, noteId, score);

        setSelectedNoteId(responseNote.id);
        setActiveView('notes');
    }, [notes, addNote, setSelectedNoteId, setActiveView, handleMatchAccept, recordResponseCreated, settings]);

    const handleRejectMatch = useCallback((requestId: string, noteId: string) => {
        const request = notes.find(n => n.id === requestId);
        const offer = notes.find(n => n.id === noteId);
        if (!request || !offer) return;

        // Record feedback for preference learning
        const engine = new MatchEngine(settings.ontology || []);
        const result = engine.calculateMatchScore(request, offer);
        const crossKeyMap = getEffectiveCrossKeyMap(settings);
        recordMatchFeedback('reject', request, offer, result, crossKeyMap);

        handleMatchReject(requestId);
        logMatchRejected(requestId, noteId);
        rejectMatch(noteId);
        recordMatchDismissed(requestId, noteId, 0);
    }, [handleMatchReject, rejectMatch, notes, settings]);

    const handleReviseRequest = useCallback((requestId: string) => {
        handleMatchClarification(requestId);
        setSelectedNoteId(requestId);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView, handleMatchClarification]);

    if (notesLoading) {
        return (
            <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton variant="rectangular" height={200} className="rounded-3xl"/>
                    <Skeleton variant="rectangular" height={96} className="rounded-2xl"/>
                    <Skeleton variant="text" lines={4}/>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-5 md:space-y-8 animate-fade-in">
                <section aria-label="Capture">
                    <StrategyResolver
                        seamRole={SEAM_ROLES.CAPTURE}
                        props={{
                            input: quickCaptureInput,
                            onInputChange: setQuickCaptureInput,
                            onSubmit: handleQuickCapture,
                            extractedProps,
                            onTemplateClick: handleQuickTemplate,
                            onFocus: startCaptureTracking,
                            onBlur: () => stopCaptureTracking(false),
                            extractionLoading: extraction.loading,
                            extractionFallbackUsed: extraction.fallbackUsed,
                            extractionProviderUsed: extraction.providerUsed,
                            extractionProviderKind: extraction.providerKind,
                            extractionError: extraction.error,
                            extractionRetry: extraction.retry,
                        }}
                        fallback={<div data-testid="quick-capture-fallback">Loading capture...</div>}
                    />
                </section>

                {localMatch && (
                    <LocalMatchCard
                        localMatch={localMatch}
                        onSelectNote={handleSelectNote}
                        onAccept={handleAcceptMatch}
                        onReject={handleRejectMatch}
                        onRevise={handleReviseRequest}
                        onViewed={handleMatchViewed}
                        onExplained={handleMatchExplained}
                        onDismissed={handleMatchDismissed}
                    />
                )}

                <section aria-label="Recent notes" data-testid="notes-list">
                    <header className="mb-3 flex items-baseline justify-between">
                        <h1 className="text-xl font-semibold text-white">Recent notes</h1>
                        {filteredNotes.length > 0 && (
                            <span className="text-xs text-gray-500">{filteredNotes.length}</span>
                        )}
                    </header>

                    {filteredNotes.length > 0 ? (
                        <div className="space-y-2" role="list" data-testid="notes-list-items">
                            {filteredNotes.map((note) => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => handleSelectNote(note.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            variant="illustrated"
                            illustration={<NotesEmptyIllustration/>}
                            title={searchTerm ? 'No notes match your search' : 'Your first note starts above'}
                            description={searchTerm
                                ? 'Try a different word, or clear the search to see every note.'
                                : 'Type what you need or offer. Press Enter to keep it. Matching happens on this device.'}
                            hint={searchTerm ? undefined : 'Try: Looking for a React developer #request'}
                        />
                    )}

                    {notes.length === 0 && (
                        <div className="mt-2 text-center">
                            <button
                                type="button"
                                onClick={loadSampleWorkspace}
                                className="text-sm text-gray-400 underline decoration-gray-600 underline-offset-4 hover:text-gray-200"
                            >
                                Or load a sample workspace
                            </button>
                        </div>
                    )}
                </section>

                {notes.length > 0 && <AdvancedPanels />}
            </div>
        </div>
    );
}

function LocalMatchCard({
    localMatch,
    onSelectNote,
    onAccept,
    onReject,
    onRevise,
    onViewed,
    onExplained,
    onDismissed,
}: {
    localMatch: any;
    onSelectNote: (id: string) => void;
    onAccept: (requestId: string, noteId: string, score: number) => void;
    onReject: (requestId: string, noteId: string) => void;
    onRevise: (requestId: string) => void;
    onViewed: () => void;
    onExplained: (noteId: string) => void;
    onDismissed: (noteId: string) => void;
}) {
    const {result} = localMatch;
    const {matches, conflicts, missing} = result;

    const crossKeyMap = getEffectiveCrossKeyMap(settings);

    const matchTypeLabel = (details?: {type?: string}) => {
        switch (details?.type) {
            case 'exact': return 'Exact match';
            case 'alias': return 'Alias match';
            case 'fuzzy': return 'Fuzzy match';
            case 'range': return 'Range match';
            case 'partial': return 'Partial match';
            case 'geo': return 'Geographic match';
            case 'date': return 'Date match';
            default: return 'Matched';
        }
    };

    const matchTypeColor = (details?: {type?: string}) => {
        switch (details?.type) {
            case 'exact': return 'text-green-400';
            case 'alias': return 'text-blue-400';
            case 'fuzzy': return 'text-yellow-400';
            case 'range': return 'text-purple-400';
            case 'partial': return 'text-orange-400';
            case 'geo': return 'text-cyan-400';
            case 'date': return 'text-pink-400';
            default: return 'text-gray-400';
        }
    };

    /** Build detailed explanation for a match including cross-key mappings and score contribution */
    const buildMatchExplanation = (m: any) => {
        const requestKey = m.requestProp.key;
        const offerKey = m.offerProp.key;
        const mappedFrom = crossKeyMap[requestKey]?.includes(offerKey)
            ? `mapped from request "${requestKey}" → offer "${offerKey}"`
            : null;

        return {
            crossKeyUsed: !!mappedFrom,
            mappedFrom,
            scoreContribution: `${Math.round(m.compatibility * 100)}%`,
        };
    };

    const hasExplanations = matches.some((m: any) => m.details) || conflicts.some((c: any) => c.details) || missing.length > 0;

    return (
        <section className="rounded-3xl border border-green-500/20 bg-green-500/5 p-6" data-testid="local-match">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-widest">
                    <CheckCircleIcon className="w-4 h-4"/> Match found locally
                </div>
                <div className="text-3xl font-bold text-green-300">{Math.round(result.score * 100)}%</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => {
                        onSelectNote(localMatch.request.id);
                        onViewed();
                    }}
                    className="text-left bg-gray-900/50 hover:bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 transition-colors"
                >
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Request</div>
                    <div className="font-semibold text-white truncate">{localMatch.request.title || 'Untitled'}</div>
                    <div className="text-sm text-gray-400 mt-1 line-clamp-2">{getTextFromHtml(localMatch.request.content)}</div>
                </button>
                <button
                    type="button"
                    onClick={() => onSelectNote(localMatch.note.id)}
                    className="text-left bg-gray-900/50 hover:bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 transition-colors"
                >
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Offer</div>
                    <div className="font-semibold text-white truncate">{localMatch.note.title || 'Untitled'}</div>
                    <div className="text-sm text-gray-400 mt-1 line-clamp-2">{getTextFromHtml(localMatch.note.content)}</div>
                </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    variant="success"
                    onClick={() => onAccept(localMatch.request.id, localMatch.note.id, result.score)}
                >
                    <CheckCircleIcon className="w-4 h-4 mr-1"/> Respond
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRevise(localMatch.request.id)}>
                    Revise request
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onReject(localMatch.request.id, localMatch.note.id)}>
                    Not a match
                </Button>
                {hasExplanations && (
                    <details
                        className="ml-auto"
                        data-testid="match-explanations"
                        onToggle={(e) => e.currentTarget.open ? onExplained(localMatch.request.id) : onDismissed(localMatch.request.id)}
                    >
                        <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200">
                            <InformationCircleIcon className="w-4 h-4 flex-shrink-0"/>
                            Why this match?
                        </summary>
                        <div className="mt-3 space-y-4 text-xs max-w-[400px]">
                            {/* Cross-key mappings used */}
                            {matches.some((m: any) => crossKeyMap[m.requestProp.key]?.includes(m.offerProp.key)) && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wide mb-2">
                                        <MapIcon className="w-3 h-3"/> Cross-key mappings used
                                    </div>
                                    <div className="space-y-1 text-blue-300">
                                        {matches
                                            .filter((m: any) => crossKeyMap[m.requestProp.key]?.includes(m.offerProp.key))
                                            .map((m: any, i: number) => (
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
                            {matches.length > 0 && (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wide mb-2">
                                        <ChartBarIcon className="w-3 h-3"/> Score breakdown
                                    </div>
                                    <div className="space-y-1 text-green-300">
                                        {matches.map((m: any, i: number) => {
                                            const explanation = buildMatchExplanation(m);
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

                            {/* Offer excerpt */}
                            <div className="p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wide mb-2">
                                    <DocumentTextIcon className="w-3 h-3"/> Offer excerpt
                                </div>
                                <div className="text-sm text-gray-300 line-clamp-3">
                                    {getTextFromHtml(localMatch.note.content).slice(0, 300)}
                                    {getTextFromHtml(localMatch.note.content).length > 300 ? '…' : ''}
                                </div>
                            </div>

                            {/* Matches */}
                            {matches.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Why it fits</div>
                                    <div className="space-y-1">
                                        {matches.map((m: any, i: number) => (
                                            <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                                                <CheckCircleIcon className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5"/>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white">
                                                        <span className="font-medium">{m.requestProp.key}</span>
                                                        <span className="text-gray-500"> {m.requestProp.operator} </span>
                                                        <span className="text-gray-300">{m.requestProp.values.join(', ')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] font-mono ${matchTypeColor(m.details)}`}>
                                                            {matchTypeLabel(m.details)}
                                                        </span>
                                                        {m.reason && <span className="text-gray-500 text-[10px]">{m.reason}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {conflicts.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Conflicts</div>
                                    <div className="space-y-1">
                                        {conflicts.map((c: any, i: number) => (
                                            <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                                                <span className="text-red-400 text-sm leading-none mt-0.5">×</span>
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

                            {missing.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-2">Missing details</div>
                                    <div className="space-y-1">
                                        {missing.map((m: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                                                <span className="text-yellow-400 text-sm leading-none">!</span>
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
            </div>

            <div className="mt-3 text-xs text-gray-500">
                {matches.length} satisfied · {conflicts.length} conflicting · {missing.length} missing
            </div>
        </section>
    );
}

function AdvancedPanels() {
    return (
        <details className="group border-t border-gray-800 pt-4 md:pt-6">
            <summary className="flex items-center gap-3 cursor-pointer select-none text-gray-400 hover:text-gray-200 transition-colors">
                <svg className="h-5 w-5 shrink-0 transform transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
                <span className="font-medium">Automations</span>
            </summary>
            <div className="mt-6" role="region" aria-label="Automations">
                <AutomationsView/>
            </div>
        </details>
    );
}
