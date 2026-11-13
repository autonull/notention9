import React, {useMemo, useCallback} from 'react';
import type {Note} from '@notention/core';

import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useSettings} from '../../hooks/useSettingsContext';
import {useCommands} from '../../hooks/useCommands';
import {NoteListItem} from '../sidebar/NoteListItem';
import {EmptyStatePreset, EmptyState, NotesEmptyIllustration} from '../ui/Primitives';
import {DashboardStatSkeleton, ActivityFeedSkeleton} from '../ui/Skeleton';
import {cn} from '../../utils/ui';
import {Skeleton} from '../ui/Skeleton';
import {InboxIcon} from '../ui/icons';

interface InboxViewProps {
    sortedNotes?: Note[];
}

export function InboxView({sortedNotes}: InboxViewProps) {
    const {notes, loading: notesLoading, addNote} = useNotes();
    const {activeView, setActiveView, selectedNoteId, setSelectedNoteId, searchTerm, sortOrder, userLocation} = useView();
    const {settings} = useSettings();
    const {handleNewNote} = useCommands({});

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
                    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

    const handleCreateNote = useCallback(() => {
        const newNote = addNote({title: ''});
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const handleSelectNote = useCallback((id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    }, [setSelectedNoteId, setActiveView]);

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
                    <div className="space-y-4">
                        <ActivityFeedSkeleton/>
                        <ActivityFeedSkeleton/>
                        <ActivityFeedSkeleton/>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-950 text-white custom-scrollbar p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                {/* Header with primary CTA */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Inbox</h1>
                        <p className="text-gray-400 mt-1">
                            {notes.length === 0 ? 'No notes yet. Capture your first thought.' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={handleCreateNote}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors w-full sm:w-auto"
                        data-testid="inbox-primary-cta"
                    >
                        <InboxIcon className="h-5 w-5"/>
                        <span>New Note</span>
                    </button>
                </header>

                {/* Notes List */}
                <section className="animate-fade-in" aria-label="Notes">
                    {filteredNotes.length > 0 ? (
                        <div className="space-y-2" role="list">
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
                            onClearSearch={() => setActiveView('inbox')} // This will clear search via URL routing
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

                {/* Progressive Disclosure: Advanced Panels */}
                <AdvancedPanels notes={notes} settings={settings} activeView={activeView} setActiveView={setActiveView} />
            </div>
        </div>
    );
}

function AdvancedPanels({
    notes,
    settings,
    activeView,
    setActiveView
}: {
    notes: Note[];
    settings: any;
    activeView: string;
    setActiveView: (view: string) => void;
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
                {/* Local Match Preview */}
                <LocalMatchPanel notes={notes} settings={settings} onNavigate={(id) => {}} />

                {/* Automations */}
                <AutomationsPanel settings={settings} />

                {/* Statistics */}
                <StatsPanel notes={notes} settings={settings} />

                {/* Recent Activity */}
                <RecentActivityPanel notes={notes} onSelectNote={(id) => {}} />
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

    React.useEffect(() => {
        if (notes.length < 2 || !settings.ontology?.length) {
            setLocalMatch(null);
            return;
        }
        const {MatchEngine} = require('@notention/core');
        const engine = new MatchEngine(settings.ontology || []);
        const match = notes
            .filter(note => note.properties.some(p => p.key === 'intent' && p.values.includes('request')))
            .flatMap(request =>
                notes
                    .filter(note => note.id !== request.id)
                    .map(note => ({request, note, result: engine.calculateMatchScore(request, note)}))
            )
            .filter(match => match.result.score > 0.4)
            .sort((a, b) => b.result.score - a.result.score)[0] ?? null;
        setLocalMatch(match);
    }, [notes, settings.ontology]);

    if (!localMatch) return null;

    return (
        <section className="bg-gray-900/50 rounded-2xl border border-gray-700/30 p-6 backdrop-blur-sm">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Local Match Found
                </h2>
                <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                    {Math.round(localMatch.result.score * 100)}% match
                </span>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Request</p>
                    <p className="font-medium">{localMatch.request.title || 'Untitled'}</p>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{localMatch.request.content.replace(/<[^>]*>/g, '')}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Offer</p>
                    <p className="font-medium">{localMatch.note.title || 'Untitled'}</p>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{localMatch.note.content.replace(/<[^>]*>/g, '')}</p>
                </div>
            </div>
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