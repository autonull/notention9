import React, {useEffect, useState, useMemo, useCallback} from 'react';
import type {View} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {agentService} from '../../services/AgentService';
import {ActivityFeed} from '../widgets/ActivityFeed';
import {getTextFromHtml, PropertyExtractor} from '@notention/core';
import {MatchEngine} from '@notention/core';
import {sanitizeHTML} from '../../utils/sanitize';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {
    CheckCircleIcon,
    CpuChipIcon,
    LightBulbIcon,
    NetworkIcon,
    NoteIcon,
    PlusIcon,
    SparklesIcon,
    PencilIcon,
    ArrowRightIcon,
    ClockIcon,
    TagIcon,
    MapIcon,
    ChatIcon,
    SettingsIcon,
    SearchIcon,
    BoltIcon,
    ShieldIcon,
    MagicWandIcon,
} from '../common/icons';
import {StatItem} from '../ui';
import {Button} from '../ui';
import {Input} from '../ui';
import {Badge} from '../ui';
import {cn} from '../../utils/ui';
import {Skeleton, DashboardStatSkeleton, ActivityFeedSkeleton, QuickActionsSkeleton} from '../ui/Skeleton';
import {EmptyState} from '../common/EmptyState';
import {modShortcut} from '../../utils/platform';

const TEMPLATES = {
    task: {
        title: 'New Task',
        content: '<p>Describe task...</p>',
        properties: [{key: 'status', operator: 'is', values: ['todo']}],
        tags: ['task'],
        icon: CheckCircleIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-500/30',
        gradient: 'gradient-success'
    },
    journal: {
        title: () => new Date().toLocaleDateString(),
        content: '<p>Thoughts...</p>',
        properties: [{key: 'type', operator: 'is', values: ['journal']}],
        tags: ['journal'],
        icon: NoteIcon,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-500/30',
        gradient: 'gradient-primary'
    },
    idea: {
        title: 'New Idea',
        content: '<p>Idea description...</p>',
        properties: [{key: 'type', operator: 'is', values: ['idea']}],
        tags: ['idea'],
        icon: LightBulbIcon,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/30',
        gradient: 'gradient-warning'
    }
};

const QUICK_ACTIONS = [
    {id: 'new-note', label: 'New Note', description: 'Start writing', icon: PencilIcon, gradient: 'gradient-primary', action: 'new-note', shortcut: modShortcut('N')},
    {id: 'map', label: 'Map View', description: 'Browse notes spatially', icon: MapIcon, gradient: 'gradient-purple', action: 'map'},
    {id: 'chat', label: 'Chat', description: 'Messages & contacts', icon: ChatIcon, gradient: 'gradient-teal', action: 'chat'},
    {id: 'network', label: 'Network', description: 'P2P connections', icon: NetworkIcon, gradient: 'gradient-warning', action: 'network'},
    {id: 'timeline', label: 'Timeline', description: 'Chronological view', icon: ClockIcon, gradient: 'gradient-info', action: 'timeline'},
    {id: 'settings', label: 'Settings', description: 'Preferences', icon: SettingsIcon, gradient: 'gradient-gray', action: 'settings'},
];

const QUICK_CAPTURE_MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

const deriveQuickNoteTitle = (input: string): string =>
    getTextFromHtml(input).replace(QUICK_CAPTURE_MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick Note';

const deriveQuickTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

const FEATURE_HIGHLIGHTS = [
    {icon: BoltIcon, title: 'Semantic Extraction', desc: 'Auto-detect properties from natural language'},
    {icon: MagicWandIcon, title: 'Smart Matching', desc: 'Discover connections between requests & offers'},
    {icon: ShieldIcon, title: 'Local-First', desc: 'Your data stays on your device by default'},
];

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

    const handleQuickTemplate = useCallback((type: keyof typeof TEMPLATES) => {
        const template = TEMPLATES[type];
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

    // Show skeleton while loading
    if (notesLoading) {
        return (
            <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                    {/* Welcome Header Skeleton */}
                    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                        <div>
                            <Skeleton variant="text" width="40%" className="text-3xl md:text-4xl font-bold mb-2"/>
                            <Skeleton variant="text" width="60%" className="text-gray-400"/>
                        </div>
                        <Skeleton variant="rectangular" height={48} width={160} className="rounded-lg w-full sm:w-auto"/>
                    </header>

                    {/* Quick Capture Section Skeleton */}
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

                    {/* Stats Grid Skeleton */}
                    <section aria-label="Statistics" className="animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                            <DashboardStatSkeleton/>
                        </div>
                    </section>

                    {/* Main Content Grid Skeleton */}
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

                {/* Feature Highlights (expandable) */}
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
                            {FEATURE_HIGHLIGHTS.map((feature, i) => (
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

                {/* Quick Capture Section */}
                <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/80 p-6 md:p-8 animate-fade-in-up stagger-1">
                    <div className="relative z-10 max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight text-white">
                            Quick Capture
                        </h2>
                        <p className="text-gray-500 text-sm mb-6 font-medium">
                            Instant notes, tasks, and ideas with semantic extraction.
                        </p>

                        <form onSubmit={handleQuickCapture} className="relative mb-6">
                            <div className="relative">
                                <Input
                                    value={quickCaptureInput}
                                    onChange={(e) => setQuickCaptureInput(e.target.value)}
                                    placeholder={`What's on your mind? Try: "Buy milk #shopping" or "Meeting at 3pm"`}
                                    leftIcon={<SearchIcon className="w-5 h-5" />}
                                    className="text-lg py-4 pr-16"
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    disabled={!quickCaptureInput.trim()}
                                    size="lg"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 touch-target-48"
                                    aria-label="Create note"
                                >
                                    <ArrowRightIcon className="w-5 h-5"/>
                                </Button>
                            </div>
                        </form>

                        {/* Semantic Preview */}
                        {(extractedProps.length > 0 || quickCaptureInput.includes('#')) && (
                            <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[28px] animate-fade-in">
                                {extractedProps.map((prop, idx) => (
                                    <Badge
                                        key={`${prop.key}-${idx}`}
                                        variant="purple"
                                        size="sm"
                                        pill
                                        icon={<SparklesIcon className="w-3 h-3" />}
                                    >
                                        {prop.key}: {prop.values.join(', ')}
                                    </Badge>
                                ))}
                                {quickCaptureInput.includes('#') && quickCaptureInput.split('#').slice(1).map((tag, idx) => (
                                    <Badge
                                        key={`tag-${idx}`}
                                        variant="info"
                                        size="sm"
                                        pill
                                        icon={<TagIcon className="w-3 h-3" />}
                                    >
                                        #{tag.split(' ')[0]}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Quick Templates */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, typeof TEMPLATES['task']][]).map(([type, t]) => (
                                <Button
                                    key={type}
                                    onClick={() => handleQuickTemplate(type)}
                                    variant="outline"
                                    size="sm"
                                    className={cn('gap-2', t.borderColor, 'hover:scale-105 active:scale-95 touch-target-48')}
                                    leftIcon={
                                        <div className={cn('p-2 rounded-xl', t.gradient, 'text-white')}>
                                            <t.icon className="w-4 h-4" />
                                        </div>
                                    }
                                >
                                    <span className={cn('text-[10px] font-bold uppercase tracking-widest', t.color)}>
                                        {type}
                                    </span>
                                </Button>
                            ))}
                        </div>

                        {/* Tips */}
                        <details className="group text-left max-w-md mx-auto">
                            <summary className="flex items-center justify-center gap-2 text-gray-500 text-sm cursor-pointer select-none">
                                <span>Capture tips</span>
                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                                </svg>
                            </summary>
                            <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 text-sm text-gray-400 space-y-2 animate-fade-in">
                                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">#tag</kbd><span>Add tags inline</span></div>
                                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">key:value</kbd><span>Add properties</span></div>
                                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">@mention</kbd><span>Reference other notes</span></div>
                                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">[link]</kbd><span>Create wiki-links</span></div>
                            </div>
                        </details>
                    </div>

                    {/* Background decoration */}
                    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
                        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-3xl" />
                    </div>
                </section>

                {/* First run sample workspace */}
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

                {/* Empty state for users with notes but no recent activity */}
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

                {/* Offline match preview */}
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
                                <div className="text-xs text-gray-500">{localMatch.result.matches.length} satisfied · {localMatch.result.conflicts.length} conflicting</div>
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
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Stats Grid */}
                <section aria-label="Statistics" className="animate-fade-in-up stagger-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatItem
                            label="Agent Status"
                            value={isConnected ? 'Online' : 'Offline'}
                            icon={<CpuChipIcon className={cn('w-5 h-5', isConnected ? 'text-green-400' : 'text-gray-500')} />}
                            trend={isConnected ? 'up' : 'neutral'}
                            trendValue={isConnected ? 'Ready' : 'Local only'}
                            variant={isConnected ? 'success' : 'default'}
                        />

                        <StatItem
                            label="Network"
                            value={`${stats.relays} Relays`}
                            icon={<NetworkIcon className={cn('w-5 h-5', stats.relays > 0 ? 'text-purple-400' : 'text-gray-500')} />}
                            trend={stats.relays > 0 ? 'up' : 'neutral'}
                            trendValue={stats.public > 0 ? `${stats.public} Shared` : 'Private'}
                            variant={stats.relays > 0 ? 'primary' : 'default'}
                        />

                        <StatItem
                            label="Notes"
                            value={stats.total}
                            icon={<NoteIcon className="w-5 h-5 text-blue-400" />}
                            trend={stats.total > 0 ? 'up' : 'neutral'}
                            trendValue={`${stats.public} public`}
                            variant="primary"
                        />

                        <StatItem
                            label="Tasks"
                            value={stats.tasks}
                            icon={<CheckCircleIcon className="w-5 h-5 text-yellow-400" />}
                            trend={stats.tasks > 0 ? 'up' : 'neutral'}
                            trendValue={stats.tasks > 0 ? 'active' : 'none'}
                            variant="warning"
                        />
                    </div>
                </section>

                {/* Main Content Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <article className="lg:col-span-2 bg-gray-900/50 rounded-3xl border border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-sm shadow-xl animate-fade-in-up stagger-4">
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

                    {/* Quick Actions */}
                    <aside className="bg-gray-900/50 rounded-3xl border border-gray-700/30 p-6 flex flex-col gap-3 backdrop-blur-sm shadow-xl animate-fade-in-up stagger-5">
                        <h2 className="text-lg font-bold text-white mb-2">Quick Actions</h2>

                        {QUICK_ACTIONS.map((action) => (
                            <Button
                                key={action.id}
                                onClick={() => handleQuickAction(action.action)}
                                variant="outline"
                                className="w-full text-left gap-4 justify-start hover:shadow-lg transition-all duration-200 touch-target-48"
                                leftIcon={
                                    <div className={cn('p-2 rounded-xl', action.gradient, 'text-white')}>
                                        <action.icon className="w-5 h-5" />
                                    </div>
                                }
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white">{action.label}</div>
                                    <div className="text-sm text-gray-400">{action.description}</div>
                                </div>
                                {action.shortcut && (
                                    <kbd className="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded uppercase tracking-wider">
                                        {action.shortcut}
                                    </kbd>
                                )}
                            </Button>
                        ))}
                    </aside>
                </section>

            </div>
        </div>
    );
}