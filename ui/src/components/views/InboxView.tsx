import React, {useMemo, useCallback, useState, useEffect} from 'react';
import {MatchEngine, type Note, PropertyExtractor, getTextFromHtml, createResponseNote, logMatchAccepted, logMatchRejected, rankMatches, deduplicateMatches, findLocalMatchesEnhanced} from '@notention/core';

import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {useCommands} from '../../hooks/useCommands';
import {useAnnounce} from '../../hooks/useAccessibility';
import {NoteListItem} from '../sidebar/NoteListItem';
import {EmptyStatePreset, EmptyState, NotesEmptyIllustration} from '../ui/Primitives';
import {DashboardStatSkeleton, ActivityFeedSkeleton, QuickActionsSkeleton} from '../ui/Skeleton';
import {cn} from '../../utils/ui';
import {Skeleton} from '../ui/Skeleton';
import {InboxIcon} from '../ui/icons';
import {OnboardingChecklist} from '../ui/OnboardingChecklist';
import {agentService} from '../../services/AgentService';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {useCaptureTracking, useMatchTracking} from '../../hooks/useFrictionRecorder';
import {useRejectedMatches} from '../../hooks/useRejectedMatches';
import {useSeamStrategy} from '../../hooks/useStrategyResolver';
import {StrategyResolver, SEAM_ROLES} from '../StrategyResolver';
import {Button} from '../ui/Button';
import {PlusIcon, BoltIcon, SparklesIcon, CpuChipIcon, NetworkIcon, NoteIcon, CheckCircleIcon, ClockIcon, PencilIcon, MapIcon, ChatIcon, SettingsIcon, InformationCircleIcon} from '../ui/icons';
import {modShortcut} from '../../utils/platform';
import {QuickActions} from '../dashboard/QuickActions';
import {AutomationsView} from '../dashboard/AutomationsView';
import {StatsGrid} from '../dashboard/StatsGrid';
import {ActivityFeed} from '../widgets/ActivityFeed';
import {sanitizeHTML} from '../../utils/sanitize';

interface InboxViewProps {
    sortedNotes?: Note[];
}

const QUICK_CAPTURE_MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

const deriveQuickNoteTitle = (input: string): string =>
    getTextFromHtml(input).replace(QUICK_CAPTURE_MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick Note';

const deriveQuickTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

export function InboxView({sortedNotes}: InboxViewProps) {
    const {notes, addNote, loading: notesLoading} = useNotes();
    const {activeView, setActiveView, selectedNoteId, setSelectedNoteId, searchTerm, sortOrder, userLocation} = useView();
    const {settings, setSettings} = useSettings();
    const {handleNewNote} = useCommands({});
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const [quickCaptureInput, setQuickCaptureInput] = useState('');
    const [agentStatus, setAgentStatus] = useState({status: 'offline'});
    const [showFeatures, setShowFeatures] = useState(false);

    // Friction tracking
    const {startTracking: startCaptureTracking, stopTracking: stopCaptureTracking, markSubmitted: markCaptureSubmitted} = useCaptureTracking('capture', 'capture');
    const {
        markViewed: markMatchViewed,
        handleAccept: handleMatchAccept,
        handleReject: handleMatchReject,
        handleClarification: handleMatchClarification,
        handleExplained: handleMatchExplained,
        handleDismissed: handleMatchDismissed,
        recordResponseCreated
    } = useMatchTracking('match', 'match');
    const {rejectMatch} = useRejectedMatches();

    const extractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);
    const [extractedProps, setExtractedProps] = useState<Array<{key: string; operator: string; values: string[]}>>([]);

    const captureStrategy = useSeamStrategy(SEAM_ROLES.CAPTURE);
    const initialOp = (captureStrategy?.getDefaultProps() as {initialOp?: string} | undefined)?.initialOp ?? 'is';

    useEffect(() => {
        if (!quickCaptureInput.trim()) {
            setExtractedProps([]);
            return;
        }
        let cancelled = false;
        extractor.extractFromText(quickCaptureInput).then(props => {
            if (!cancelled) {
                setExtractedProps(props.map(p => ({key: p.key, operator: p.operator, values: p.values})));
            }
        });
        return () => {cancelled = true;};
    }, [quickCaptureInput, extractor]);

    useEffect(() => {
        const handleStatusChange = (status: {status: string}) => setAgentStatus(status);
        agentService.on('status_change', handleStatusChange);
        return () => agentService.off('status_change', handleStatusChange);
    }, []);

    useEffect(() => {
        const handlePasteToCapture = (event: CustomEvent<{text: string}>) => {
            setQuickCaptureInput(event.detail.text);
            // Focus the input if we're on the inbox view
            if (activeView === 'inbox') {
                requestAnimationFrame(() => {
                    const input = document.querySelector('[data-testid="quick-capture-input"]') as HTMLInputElement;
                    input?.focus();
                });
            } else {
                // Navigate to inbox and focus
                setActiveView('inbox');
            }
        };
        window.addEventListener('paste-to-capture', handlePasteToCapture as EventListener);
        return () => window.removeEventListener('paste-to-capture', handlePasteToCapture as EventListener);
    }, [activeView, setActiveView]);

    // Onboarding tracking: Step 1 - Capture a note
    useEffect(() => {
        const onboarding = settings.onboarding;
        if (!onboarding || onboarding.completed || onboarding.dismissed || onboarding.captureCompleted) {
            return;
        }
        if (notes.length > 0) {
            setSettings(s => ({
                ...s,
                onboarding: {
                    ...onboarding,
                    captureCompleted: true,
                    step: Math.max(onboarding.step, 2),
                },
            }));
        }
    }, [notes.length, settings.onboarding, setSettings]);

    // Onboarding tracking: Step 2 - See a match
    useEffect(() => {
        const onboarding = settings.onboarding;
        if (!onboarding || onboarding.completed || onboarding.dismissed || onboarding.matchCompleted) {
            return;
        }
        const hasRequest = notes.some(n => n.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        const hasOffer = notes.some(n => n.properties.some(p => p.key === 'intent' && p.values.includes('offer')));
        if (hasRequest && hasOffer) {
            setSettings(s => ({
                ...s,
                onboarding: {
                    ...onboarding,
                    matchCompleted: true,
                    step: Math.max(onboarding.step, 3),
                },
            }));
        }
    }, [notes, settings.onboarding, setSettings]);

    // Onboarding tracking: Step 3 - Take action (respond to match)
    useEffect(() => {
        const onboarding = settings.onboarding;
        if (!onboarding || onboarding.completed || onboarding.dismissed || onboarding.actionCompleted) {
            return;
        }
        // Check if there's a response note (created by accepting a match)
        const hasResponse = notes.some(n => n.source?.type === 'match-response' || n.properties.some(p => p.key === 'type' && p.values.includes('response')));
        if (hasResponse) {
            setSettings(s => ({
                ...s,
                onboarding: {
                    ...onboarding,
                    actionCompleted: true,
                    step: 4,
                },
            }));
        }
    }, [notes, settings.onboarding, setSettings]);

    const handleCreateNote = useCallback(() => {
        const newNote = addNote({title: ''});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleQuickCapture = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCaptureInput.trim()) return;

        markCaptureSubmitted();
        stopCaptureTracking(true);

        const note = addNote({
            title: deriveQuickNoteTitle(quickCaptureInput),
            content: sanitizeHTML(`<p>${quickCaptureInput}</p>`),
            tags: ['quick-capture', ...deriveQuickTags(quickCaptureInput)],
            properties: extractedProps.map(prop => ({...prop, operator: initialOp}))
        });

        setSelectedNoteId(note.id);
        setActiveView('notes');
        setQuickCaptureInput('');
    }, [quickCaptureInput, extractedProps, initialOp, addNote, setSelectedNoteId, setActiveView, markCaptureSubmitted, stopCaptureTracking]);

    const handleQuickTemplate = useCallback((type: 'task' | 'journal' | 'idea') => {
        interface Template {
            title: string | (() => string);
            content: string;
            tags: string[];
            properties: Array<{key: string; operator: string; values: string[]}>;
        }
        const templates: Record<string, Template> = {
            task: {
                title: 'New Task',
                content: '<p>Describe task...</p>',
                properties: [{key: 'status', operator: 'is', values: ['todo']}],
                tags: ['task'],
            },
            journal: {
                title: () => new Date().toLocaleDateString(),
                content: '<p>Thoughts...</p>',
                properties: [{key: 'type', operator: 'is', values: ['journal']}],
                tags: ['journal'],
            },
            idea: {
                title: 'New Idea',
                content: '<p>Idea description...</p>',
                properties: [{key: 'type', operator: 'is', values: ['idea']}],
                tags: ['idea'],
            }
        };
        const template = templates[type];
        const title = typeof template.title === 'function' ? template.title() : template.title;

        markCaptureSubmitted();
        stopCaptureTracking(true);

        const note = addNote({
            title,
            content: template.content,
            tags: template.tags,
            properties: template.properties
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView, markCaptureSubmitted, stopCaptureTracking]);

    const handleQuickAction = useCallback((action: string) => {
        if (action === 'new-note') {
            handleCreateNote();
            return;
        }
        setActiveView(action as any);
    }, [handleCreateNote, setActiveView]);

    const getSortedFilteredNotes = useMemo(() => {
        return (search: string, sort: string, showTrash: boolean, location: {lat: number; lng: number} | null) => {
            let filtered = [...notes];

            if (showTrash) {
                filtered = filtered.filter(n => n.trashed);
            } else {
                filtered = filtered.filter(n => !n.trashed);
            }

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

    const filteredNotes = getSortedFilteredNotes(searchTerm, sortOrder, activeView === 'trash', userLocation);

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

    const stats = useMemo(() => notes.reduce((acc, n) => {
        acc.total++;
        if (n.privacy === 'public') acc.public++;
        if (n.properties.some(p => p.key === 'status' && p.values.includes('todo'))) acc.tasks++;
        if (n.source?.type === 'skill') acc.skills++;
        return acc;
    }, {total: 0, public: 0, tasks: 0, skills: 0, relays: settings.nostr?.relays?.length || 0}), [notes, settings.nostr?.relays?.length]);

    const recentNotes = useMemo(() => [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5), [notes]);

    const localMatch = useMemo(() => {
        if (notes.length < 2) return null;
        const engine = new MatchEngine(settings.ontology || []);
        const requests = notes.filter(note => note.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        const offers = notes.filter(note => !note.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        
        if (requests.length === 0 || offers.length === 0) return null;
        
        // Use enhanced matching with ranking and deduping for the first request
        const request = requests[0];
        const matches = findLocalMatchesEnhanced(engine, request, offers, {
            threshold: 0.4,
            ranking: { scoreWeight: 0.5, recencyWeight: 0.2, coverageWeight: 0.2, distanceWeight: 0.1 },
            deduplicate: { similarityThreshold: 0.85 },
        });
        
        return matches[0] ? { request, note: matches[0].note, result: matches[0].result } : null;
    }, [notes, settings.ontology]);

    const handleMatchViewed = useCallback(() => markMatchViewed(localMatch?.request.id), [markMatchViewed, localMatch?.request.id]);

    const handleAcceptMatch = useCallback((requestId: string, noteId: string, score: number) => {
        const request = notes.find(n => n.id === requestId);
        const offer = notes.find(n => n.id === noteId);
        if (!request || !offer) return;

        // Create response note
        const responseNote = createResponseNote(request, offer, score);

        // Add to local notes
        addNote(responseNote);

        // Log to ledger
        logMatchAccepted(requestId, noteId, responseNote.id, score);

        // Record friction events: the match was acted on, and a response exists
        handleMatchAccept(requestId);
        recordResponseCreated(requestId);

        // Navigate to the response note
        setSelectedNoteId(responseNote.id);
        setActiveView('notes');
    }, [notes, addNote, setSelectedNoteId, setActiveView, handleMatchAccept, recordResponseCreated]);

    const handleRejectMatch = useCallback((requestId: string, noteId: string) => {
        handleMatchReject(requestId);
        logMatchRejected(requestId, noteId);
        rejectMatch(noteId);
    }, [handleMatchReject, rejectMatch]);

    const handleReviseRequest = useCallback((requestId: string) => {
        handleMatchClarification(requestId);
        setSelectedNoteId(requestId);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView, handleMatchClarification]);

    const isConnected = agentStatus.status === 'connected';

    if (notesLoading) {
        return (
            <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                        <div>
                            <Skeleton variant="text" width="40%" className="text-3xl md:text-4xl font-bold mb-2"/>
                            <Skeleton variant="text" width="60%" className="text-gray-400"/>
                        </div>
                        <Skeleton variant="rectangular" height={48} width={160} className="rounded-lg w-full sm:w-auto"/>
                    </header>

                    <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/80 p-6 md:p-8 animate-fade-in">
                        <div className="relative z-10 max-w-2xl mx-auto text-center">
                            <Skeleton variant="text" width="50%" className="text-2xl md:text-3xl font-bold mb-2 mx-auto"/>
                            <Skeleton variant="text" width="70%" className="text-gray-500 text-sm mb-6 mx-auto"/>
                            <Skeleton variant="rectangular" height={56} width="100%" className="rounded-lg mb-6 mx-auto max-w-md"/>
                            <Skeleton variant="text" lines={1} className="mb-6 justify-center"/>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Skeleton variant="rectangular" height={36} width={80} className="rounded-lg"/>
                                <Skeleton variant="rectangular" height={36} width={80} className="rounded-lg"/>
                                <Skeleton variant="rectangular" height={36} width={80} className="rounded-lg"/>
                            </div>
                        </div>
                    </section>

                    <section aria-label="Statistics" className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        <article className="lg:col-span-2 bg-gray-900/50 rounded-3xl border border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
                            <header className="p-6 border-b border-gray-700/30 flex justify-between items-center bg-gray-800/20">
                                <Skeleton variant="text" width="40%" className="text-xl font-bold"/>
                                <Skeleton variant="rectangular" height={32} width={80} className="rounded-lg"/>
                            </header>
                            <ActivityFeedSkeleton/>
                        </article>
                        <QuickActionsSkeleton/>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                {/* Overview Section (formerly Dashboard) */}
                <OverviewSection
                    notes={notes}
                    stats={stats}
                    recentNotes={recentNotes}
                    localMatch={localMatch}
                    isConnected={isConnected}
                    quickCaptureInput={quickCaptureInput}
                    setQuickCaptureInput={setQuickCaptureInput}
                    extractedProps={extractedProps}
                    handleQuickCapture={handleQuickCapture}
                    handleQuickTemplate={handleQuickTemplate}
                    handleQuickAction={handleQuickAction}
                    handleCreateNote={handleCreateNote}
                    handleSelectNote={handleSelectNote}
                    handleAcceptMatch={handleAcceptMatch}
                    handleRejectMatch={handleRejectMatch}
                    handleReviseRequest={handleReviseRequest}
                    handleMatchViewed={handleMatchViewed}
                    handleMatchExplained={handleMatchExplained}
                    handleMatchDismissed={handleMatchDismissed}
                    showFeatures={showFeatures}
                    setShowFeatures={setShowFeatures}
                    loadSampleWorkspace={loadSampleWorkspace}
                    startCaptureTracking={startCaptureTracking}
                    stopCaptureTracking={stopCaptureTracking}
                />

                <OnboardingChecklist/>

                {/* Notes List */}
                <section className="animate-fade-in" aria-label="Notes" data-testid="notes-list">
                    {filteredNotes.length > 0 ? (
                        <div className="space-y-2" role="list" data-testid="notes-list-items">
                            {filteredNotes.map((note) => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => handleSelectNote(note.id)}
                                    showFullContent={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyStatePreset
                            type={searchTerm ? 'noMatches' : 'firstNote'}
                            searchTerm={searchTerm}
                            onClearSearch={() => setActiveView('inbox')}
                            onCreateNote={handleCreateNote}
                        />
                    )}

                    {filteredNotes.length === 0 && notes.length > 0 && !searchTerm && (
                        <EmptyState
                            variant="illustrated"
                            illustration={<NotesEmptyIllustration/>}
                            title="No notes match your filters"
                            description="Try adjusting your filters or sort order."
                            hint="Press ⌘/ to search, or use filters to narrow results"
                            showShortcuts
                            shortcutContext="notes"
                        />
                    )}
                </section>

                {/* Progressive Disclosure: Advanced Panels (deduplicated) */}
                <AdvancedPanels
                    notes={notes}
                    settings={settings}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    onSelectNote={handleSelectNote}
                />
            </div>
        </div>
    );
}

function OverviewSection({
    notes,
    stats,
    recentNotes,
    localMatch,
    isConnected,
    quickCaptureInput,
    setQuickCaptureInput,
    extractedProps,
    handleQuickCapture,
    handleQuickTemplate,
    handleQuickAction,
    handleCreateNote,
    handleSelectNote,
    handleAcceptMatch,
    handleRejectMatch,
    handleReviseRequest,
    handleMatchViewed,
    handleMatchExplained,
    handleMatchDismissed,
    showFeatures,
    setShowFeatures,
    loadSampleWorkspace,
    startCaptureTracking,
    stopCaptureTracking
}: any) {
    return (
        <>
            {/* Welcome Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-down">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                        Welcome back
                    </h1>
                    <p className="mt-1 text-gray-400">
                        Capture thoughts, discover connections, build knowledge.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button
                        onClick={handleCreateNote}
                        leftIcon={<PlusIcon className="w-5 h-5"/>}
                        size="lg"
                        className="touch-target-48"
                    >
                        New Note
                    </Button>
                    <Button
                        onClick={() => setShowFeatures(!showFeatures)}
                        variant="ghost"
                        size="lg"
                        leftIcon={<BoltIcon className="w-5 h-5"/>}
                        className="touch-target-48 hidden sm:inline-flex"
                    >
                        Features
                    </Button>
                </div>
            </header>

            {showFeatures && (
                <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-fade-in-up stagger-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-300">
                            <BoltIcon className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">What makes Notention different</h3>
                            <p className="text-sm text-gray-400">Powerful features for knowledge capture</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {icon: BoltIcon, title: 'Semantic Extraction', desc: 'Auto-detect properties from natural language'},
                            {icon: SparklesIcon, title: 'Smart Matching', desc: 'Discover connections between requests & offers'},
                            {icon: CpuChipIcon, title: 'Local-First', desc: 'Your data stays on your device by default'},
                        ].map((feature, i) => (
                            <div key={feature.title} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 animate-fade-in-up" style={{animationDelay: `${(i + 2) * 50}ms`}}>
                                <div className="p-2 bg-gray-800 rounded-lg text-purple-400 mb-3">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                                <p className="text-sm text-gray-400">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Quick Capture (StrategyResolver integration) */}
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
                }}
                fallback={<div data-testid="quick-capture-fallback">Loading capture...</div>}
            />

            {notes.length === 0 && (
                <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-slide-in-up stagger-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300 flex-shrink-0">
                            <SparklesIcon className="w-7 h-7"/>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-white">Try a sample workspace</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Ten local notes: a request and an offer that match, an event, places, and tasks. Nothing leaves your device.
                            </p>
                        </div>
                        <Button
                            onClick={loadSampleWorkspace}
                            variant="primary"
                            size="md"
                            className="w-full sm:w-auto flex-shrink-0 touch-target-48"
                        >
                            Load sample workspace
                        </Button>
                    </div>
                </section>
            )}

            {notes.length > 0 && recentNotes.length === 0 && (
                <section className="rounded-3xl border border-gray-700/50 bg-gray-900/50 p-8 animate-fade-in-up">
                    <EmptyState
                        icon={NoteIcon}
                        title="No recent activity"
                        description="Your notes will appear here as you create and edit them."
                        action={
                            <Button
                                onClick={handleCreateNote}
                                variant="primary"
                                leftIcon={<PlusIcon className="w-4 h-4"/>}
                                className="touch-target-48"
                            >
                                Create your first note
                            </Button>
                        }
                    />
                </section>
            )}

            {localMatch && (
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
                            <div className="text-xs text-gray-500">
                                {localMatch.result.matches.length} satisfied · {localMatch.result.conflicts.length} conflicting · {localMatch.result.missing.length} missing
                            </div>

                            {(() => {
                                const getMatchTypeColor = (details?: any) => {
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
                                };
                                const getMatchTypeLabel = (details?: any) => {
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
                                };
                                const hasExplanations = localMatch.result.matches.some((m: any) => m.details) ||
                                    localMatch.result.conflicts.some((c: any) => c.details) ||
                                    localMatch.result.missing.length > 0;
                                return hasExplanations ? (
                                    <details
                                        className="mt-4 text-left md:text-left"
                                        data-testid="match-explanations"
                                        onToggle={(e) => e.currentTarget.open ? handleMatchExplained(localMatch.request.id) : handleMatchDismissed(localMatch.request.id)}
                                    >
                                        <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200">
                                            <InformationCircleIcon className="w-4 h-4 flex-shrink-0"/>
                                            Show details
                                        </summary>
                                        <div className="mt-3 space-y-3 text-xs">
                                            {localMatch.result.matches.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Why it fits</div>
                                                    <div className="space-y-1">
                                                        {localMatch.result.matches.map((m: any, i: number) => (
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
                                                                            {getMatchTypeLabel(m.details)}
                                                                        </span>
                                                                        {m.reason && (
                                                                            <span className="text-gray-500 text-[10px]">{m.reason}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {localMatch.result.conflicts.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Conflicts</div>
                                                    <div className="space-y-1">
                                                        {localMatch.result.conflicts.map((c: any, i: number) => (
                                                            <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                                                                <svg className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                                                </svg>
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

                                            {localMatch.result.missing.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-2">Missing details</div>
                                                    <div className="space-y-1">
                                                        {localMatch.result.missing.map((m: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                                                                <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                                </svg>
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
                                ) : null;
                            })()}

                            <div className="mt-3 flex flex-wrap justify-center md:justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSelectNote(localMatch.request.id)}
                                >
                                    Open request
                                </Button>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleSelectNote(localMatch.note.id)}
                                >
                                    Open match
                                </Button>
                                <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleAcceptMatch(localMatch.request.id, localMatch.note.id, localMatch.result.score)}
                                >
                                    <CheckCircleIcon className="w-4 h-4 mr-1"/> Respond
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <AutomationsView/>

            <StatsGrid stats={stats} isConnected={isConnected}/>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <article className="lg:col-span-2 bg-gray-900/50 rounded-3xl border border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
                    <header className="p-6 border-b border-gray-700/30 flex justify-between items-center bg-gray-800/20">
                        <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                            <div className="p-2 bg-gray-800 rounded-lg text-gray-300">
                                <ClockIcon className="w-5 h-5"/>
                            </div>
                            Recent Activity
                        </h2>
                    </header>
                    <div className="p-6 flex-1">
                        {recentNotes.length > 0 ? (
                            <ActivityFeed recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                        ) : (
                            <EmptyState
                                icon={ClockIcon}
                                title="No recent activity"
                                description="Your recently updated notes will appear here."
                                className="h-full"
                            />
                        )}
                    </div>
                </article>
                <QuickActions onAction={handleQuickAction}/>
            </section>
        </>
    );
}

function AdvancedPanels({
    notes,
    settings,
    activeView,
    setActiveView,
    onSelectNote
}: {
    notes: Note[];
    settings: any;
    activeView: string;
    setActiveView: (view: string) => void;
    onSelectNote: (id: string) => void;
}) {
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    if (notes.length === 0) return null;

    return (
        <details className="group border-t border-gray-800 pt-8 animate-fade-in" open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
            <summary className="flex items-center gap-3 cursor-pointer select-none text-gray-400 hover:text-gray-200 transition-colors">
                <svg className="h-5 w-5 shrink-0 transform transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
                <span className="font-medium text-lg">Advanced</span>
                <span className="px-2 py-0.5 text-xs bg-gray-800 rounded-full text-gray-500">
                    {advancedPanelCount(notes, settings)} panels
                </span>
            </summary>

            <div className="mt-6 space-y-8" role="region" aria-label="Advanced panels">
                {/* Automations (only if not shown in Overview) */}
                <AutomationsPanel settings={settings} />
            </div>
        </details>
    );
}

function advancedPanelCount(notes: Note[], settings: any): number {
    let count = 0;
    if (notes.length >= 2 && settings.ontology?.length) count++; // LocalMatch
    if (settings.automations?.enabled) count++; // Automations
    count++; // Stats always shown
    count++; // Recent Activity always shown
    return count;
}

function LocalMatchPanel({notes, settings, onNavigate}: {notes: Note[]; settings: any; onNavigate: (id: string) => void}) {
    const [localMatch, setLocalMatch] = React.useState<any>(null);
    const [showExplanation, setShowExplanation] = React.useState(false);
    const announce = useAnnounce();

    React.useEffect(() => {
        if (notes.length < 2 || !settings.ontology?.length) {
            setLocalMatch(null);
            return;
        }
        const engine = new MatchEngine(settings.ontology || []);
        const requests = notes.filter(note => note.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        const offers = notes.filter(note => !note.properties.some(p => p.key === 'intent' && p.values.includes('request')));
        
        if (requests.length === 0 || offers.length === 0) {
            setLocalMatch(null);
            return;
        }
        
        // Use enhanced matching with ranking and deduping for the first request
        const request = requests[0];
        const matches = findLocalMatchesEnhanced(engine, request, offers, {
            threshold: 0.4,
            ranking: { scoreWeight: 0.5, recencyWeight: 0.2, coverageWeight: 0.2, distanceWeight: 0.1 },
            deduplicate: { similarityThreshold: 0.85 },
        });
        
        const match = matches[0] ? { request, note: matches[0].note, result: matches[0].result } : null;
        const previousMatch = localMatch;
        setLocalMatch(match);
        // Announce new match
        if (match && (!previousMatch || previousMatch.note.id !== match.note.id)) {
            announce(`Match found: ${Math.round(match.result.score * 100)}% compatibility with ${match.note.title || 'untitled note'}`);
        }
    }, [notes, settings.ontology, localMatch, announce]);

    if (!localMatch) return null;

    const {result} = localMatch;
    const {matches, conflicts, missing} = result;

    const renderMatchRow = (match: any) => (
        <div key={`${match.requestProp.key}-${match.requestProp.operator}-${match.requestProp.values.join(',')}`} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{match.requestProp.key}</p>
                <p className="text-xs text-gray-400 mt-0.5">{match.reason}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                        {match.requestProp.operator} {match.requestProp.values.join(', ')}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded">
                        {Math.round(match.compatibility * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );

    const renderConflictRow = (conflict: any) => (
        <div key={`${conflict.requestProp.key}-${conflict.requestProp.operator}-${conflict.requestProp.values.join(',')}`} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{conflict.requestProp.key}</p>
                <p className="text-xs text-gray-400 mt-0.5">{conflict.reason}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                        {conflict.requestProp.operator} {conflict.requestProp.values.join(', ')}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded">
                        {Math.round(conflict.compatibility * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );

    const renderMissingRow = (prop: any) => (
        <div key={prop.key} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{prop.key}</p>
                <p className="text-xs text-gray-400 mt-0.5">Required constraint not satisfied</p>
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded mt-1 inline-block">
                    {prop.operator} {prop.values.join(', ')}
                </span>
            </div>
        </div>
    );

    return (
        <section className="bg-gray-900/50 rounded-2xl border border-gray-700/30 p-6 backdrop-blur-sm">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Local Match Found
                </h2>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                        {Math.round(result.score * 100)}% match
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1"
                        aria-expanded={showExplanation}
                    >
                        <svg className={`h-4 w-4 transition-transform ${showExplanation ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                        {showExplanation ? 'Hide details' : 'Why this match?'}
                    </button>
                </div>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => onNavigate(localMatch.request.id)}
                    className="text-left bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-4 transition-colors"
                >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Request</p>
                    <p className="font-medium">{localMatch.request.title || 'Untitled'}</p>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{localMatch.request.content.replace(/<[^>]*>/g, '')}</p>
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate(localMatch.note.id)}
                    className="text-left bg-gray-800/50 hover:bg-gray-700/50 rounded-xl p-4 transition-colors"
                >
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Offer</p>
                    <p className="font-medium">{localMatch.note.title || 'Untitled'}</p>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{localMatch.note.content.replace(/<[^>]*>/g, '')}</p>
                </button>
            </div>

            {showExplanation && (
                <div className="mt-4 space-y-4 animate-slide-down" role="region" aria-label="Match explanation">
                    {matches.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                </svg>
                                Matched constraints ({matches.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {matches.map(renderMatchRow)}
                            </div>
                        </div>
                    )}
                    {conflicts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Conflicts ({conflicts.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {conflicts.map(renderConflictRow)}
                            </div>
                        </div>
                    )}
                    {missing.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                Missing required ({missing.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {missing.map(renderMissingRow)}
                            </div>
                        </div>
                    )}
                    {(matches.length === 0 && conflicts.length === 0 && missing.length === 0) && (
                        <p className="text-gray-500 text-center py-4">No detailed match information available.</p>
                    )}
                </div>
            )}

            <div className="mt-4 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Accept Match
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Dismiss
                </button>
            </div>
        </section>
    );
}

function AutomationsPanel({settings}: {settings: any}) {
    const automations = settings.automations?.rules || [];

    if (automations.length === 0) return null;

    return (
        <section className="bg-gray-900/50 rounded-2xl border border-gray-700/30 p-6 backdrop-blur-sm">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Automations
                </h2>
                <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full">{automations.length}</span>
            </header>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {automations.map((rule: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">{rule.trigger}</span>
                            <span className="text-sm text-gray-300">{rule.action}</span>
                        </div>
                        <span className="text-xs text-gray-500">{rule.enabled ? 'Active' : 'Paused'}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function StatsPanel({notes, settings}: {notes: Note[]; settings: any}) {
    const stats = React.useMemo(() => notes.reduce((acc, n) => {
        acc.total++;
        if (n.privacy === 'public') acc.public++;
        if (n.properties.some(p => p.key === 'status' && p.values.includes('todo'))) acc.tasks++;
        if (n.source?.type === 'skill') acc.skills++;
        return acc;
    }, {total: 0, public: 0, tasks: 0, skills: 0, relays: settings.nostr?.relays?.length || 0}), [notes, settings.nostr?.relays?.length]);

    return (
        <section className="bg-gray-900/50 rounded-2xl border border-gray-700/30 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total" value={stats.total} icon="📝"/>
                <StatCard label="Public" value={stats.public} icon="🌐"/>
                <StatCard label="Tasks" value={stats.tasks} icon="✅"/>
                <StatCard label="Skills" value={stats.skills} icon="🧠"/>
                <StatCard label="Relays" value={stats.relays} icon="📡"/>
            </div>
        </section>
    );
}

function StatCard({label, value, icon}: {label: string; value: number; icon: string}) {
    return (
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}

function RecentActivityPanel({notes, onSelectNote}: {notes: Note[]; onSelectNote: (id: string) => void}) {
    const recentNotes = React.useMemo(() => [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10), [notes]);

    return (
        <section className="bg-gray-900/50 rounded-2xl border border-gray-700/30 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Recent Activity
            </h2>
            {recentNotes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentNotes.map((note) => (
                        <button
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            className="w-full text-left p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                        >
                            <div className="h-10 w-10 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{note.title || 'Untitled'}</p>
                                <p className="text-xs text-gray-500 truncate">{note.content.replace(/<[^>]*>/g, '').slice(0, 60)}</p>
                            </div>
                            <time className="text-xs text-gray-500 whitespace-nowrap" dateTime={note.updatedAt}>
                                {new Date(note.updatedAt).toLocaleString()}
                            </time>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}