import React, {useEffect, useState, useMemo, useCallback} from 'react';
import type {View} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {MatchEngine, PropertyExtractor, getTextFromHtml} from '@notention/core';
import {sanitizeHTML} from '../../utils/sanitize';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {DashboardHeader} from './DashboardHeader';
import {FeatureHighlights} from './FeatureHighlights';
import {QuickCapture} from './QuickCapture';
import {SampleWorkspacePrompt} from './SampleWorkspacePrompt';
import {LocalMatchPreview} from './LocalMatchPreview';
import {StatsGrid} from './StatsGrid';
import {RecentActivity} from './RecentActivity';
import {QuickActions} from './QuickActions';
import {AutomationsView} from './AutomationsView';
import {EmptyStateForNotes} from './EmptyStateForNotes';
import {StatItem} from '../ui';
import {LoadingSpinner} from '../ui/icons';
import {cn} from '../../utils/ui';
import {modShortcut} from '../../utils/platform';
import {DashboardStatSkeleton, ActivityFeedSkeleton, QuickActionsSkeleton} from '../ui/Skeleton';
import {Skeleton} from '../ui/Skeleton';

const QUICK_CAPTURE_MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

const deriveQuickNoteTitle = (input: string): string =>
    getTextFromHtml(input).replace(QUICK_CAPTURE_MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick Note';

const deriveQuickTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

export function DashboardView() {
    const {notes, addNote, loading: notesLoading} = useNotes();
    const {setActiveView, setSelectedNoteId} = useView();
    const {settings} = useSettings();
    const [quickCaptureInput, setQuickCaptureInput] = useState('');
    const [agentStatus, setAgentStatus] = useState({status: 'offline'});
    const {load: loadSampleWorkspace} = useDemoWorkspace();
    const [showFeatures, setShowFeatures] = useState(false);

    const extractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);
    const extractedProps = useMemo(() => {
        if (!quickCaptureInput.trim()) return [];
        return extractor.extractFromText(quickCaptureInput);
    }, [quickCaptureInput, extractor]);

    useEffect(() => {
        const handleStatusChange = (status: {status: string}) => setAgentStatus(status);
        agentService.on('status_change', handleStatusChange);
        return () => agentService.off('status_change', handleStatusChange);
    }, []);

    const handleCreateNote = useCallback(() => {
        const newNote = addNote({title: ''});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleQuickCapture = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCaptureInput.trim()) return;

        const note = addNote({
            title: deriveQuickNoteTitle(quickCaptureInput),
            content: sanitizeHTML(`<p>${quickCaptureInput}</p>`),
            tags: ['quick-capture', ...deriveQuickTags(quickCaptureInput)],
            properties: extractedProps
        });

        setSelectedNoteId(note.id);
        setActiveView('notes');
        setQuickCaptureInput('');
    }, [quickCaptureInput, extractedProps, addNote, setSelectedNoteId, setActiveView]);

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

        const note = addNote({
            title,
            content: template.content,
            tags: template.tags,
            properties: template.properties
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleQuickAction = useCallback((action: string) => {
        if (action === 'new-note') {
            handleCreateNote();
            return;
        }
        setActiveView(action as View);
    }, [handleCreateNote, setActiveView]);

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

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

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

                <DashboardHeader onCreateNote={handleCreateNote} showFeatures={showFeatures} onToggleFeatures={() => setShowFeatures(!showFeatures)}/>

                {showFeatures && <FeatureHighlights/>}

                <QuickCapture
                    input={quickCaptureInput}
                    onInputChange={setQuickCaptureInput}
                    onSubmit={handleQuickCapture}
                    extractedProps={extractedProps}
                    onTemplateClick={handleQuickTemplate}
                />

                {notes.length === 0 && <SampleWorkspacePrompt onLoad={loadSampleWorkspace}/>}

                {notes.length > 0 && recentNotes.length === 0 && <EmptyStateForNotes onCreateNote={handleCreateNote}/>}

                {localMatch && <LocalMatchPreview match={localMatch} onSelectNote={handleSelectNote}/>}

                <AutomationsView/>

                <StatsGrid stats={stats} isConnected={isConnected}/>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <RecentActivity recentNotes={recentNotes} onSelectNote={handleSelectNote}/>
                    <QuickActions onAction={handleQuickAction}/>
                </section>

            </div>
        </div>
    );
}