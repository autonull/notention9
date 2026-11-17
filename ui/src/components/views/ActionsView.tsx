import React, {useMemo, useState} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {Button} from '../ui/Button';
import {Note, getTextFromHtml} from '@notention/core';
import {Skeleton} from '../ui/Skeleton';
import {LightBulbIcon} from '../ui/icons';
import {EmptyState} from '../ui/Primitives';

const STATUS_ORDER = ['running', 'queued', 'todo', 'completed'] as const;
const STATUS_LABELS: Record<string, string> = {
    running: 'Running',
    queued: 'Queued',
    todo: 'Todo',
    completed: 'Completed',
};

const statusOf = (note: Note) => note.properties.find(property => property.key === 'status')?.values[0];

export function ActionsView() {
    const {notes, loading, addNote} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();
    const isMobile = useIsMobile();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const groups = useMemo(() => {
        const byStatus = new Map<string, Note[]>();
        for (const note of notes) {
            const status = statusOf(note);
            const isTask = note.tags.includes('task') || STATUS_ORDER.includes(status as typeof STATUS_ORDER[number]);
            if (!isTask) continue;
            const group = status ?? 'todo';
            byStatus.set(group, [...(byStatus.get(group) ?? []), note]);
        }
        const rank = (status: string) => {
            const index = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
            return index === -1 ? STATUS_ORDER.length : index;
        };
        return [...byStatus.entries()]
            .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
            .map(([status, items]) => ({status, label: STATUS_LABELS[status] ?? status, notes: items}));
    }, [notes]);

    if (loading) {
        return (
            <div className="h-full bg-gray-900 p-4 md:p-6 flex flex-col overflow-y-auto text-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LightBulbIcon className="w-6 h-6 text-yellow-400"/> Actions
                    </h1>
                    <Button variant="primary" disabled>+ New Task</Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div>
                        {Array.from({length: 4}).map((_, index) => (
                            <Skeleton key={index} variant="rectangular" height={64} width="100%" className="rounded-lg mb-2"/>
                        ))}
                    </div>
                    <Skeleton variant="rectangular" height={320} width="100%" className="rounded-lg hidden lg:block"/>
                </div>
            </div>
        );
    }

    const openNote = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const handleRowClick = (id: string) => {
        if (isMobile) {
            openNote(id);
            return;
        }
        setSelectedId(id);
    };

    const handleNewTask = () => {
        const note = addNote({
            title: 'New Task',
            properties: [{key: 'status', operator: 'is', values: ['todo']}],
            tags: ['task'],
        });
        openNote(note.id);
    };

    const selected = notes.find(note => note.id === selectedId) ?? groups[0]?.notes[0] ?? null;

    const renderRow = (note: Note) => {
        const title = note.title || 'Untitled Note';
        const preview = getTextFromHtml(note.content).trim().slice(0, 100);
        const details = note.properties.filter(property => property.key !== 'status');
        return (
            <button
                key={note.id}
                onClick={() => handleRowClick(note.id)}
                aria-current={selected?.id === note.id ? 'true' : undefined}
                className={`w-full px-3 py-3 text-left transition-colors ${
                    selected?.id === note.id ? 'bg-gray-800/80' : 'hover:bg-gray-800/60'
                }`}
            >
                <div className="font-semibold truncate">{title}</div>
                {(details.length > 0 || note.tags.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {details.slice(0, 3).map(property => (
                            <span
                                key={property.key}
                                className="rounded bg-gray-700/40 px-1.5 py-0.5 text-[11px] text-gray-300"
                            >
                                {property.key}: {property.values.join(', ')}
                            </span>
                        ))}
                        {note.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] text-blue-300">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                {preview && preview !== title && (
                    <div className="text-sm text-gray-400 mt-1 line-clamp-1">{preview}</div>
                )}
            </button>
        );
    };

    return (
        <div className="h-full bg-gray-900 p-4 md:p-6 flex flex-col lg:overflow-hidden text-gray-200">
            <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <LightBulbIcon className="w-6 h-6 text-yellow-400"/> Actions
                </h1>
                <Button variant="primary" onClick={handleNewTask}>
                    + New Task
                </Button>
            </div>

            {groups.length === 0 ? (
                <EmptyState
                    title="No actions yet"
                    description="Tasks and automations appear here once a note has a status."
                    action={<Button variant="primary" onClick={handleNewTask}>Create a task</Button>}
                />
            ) : (
                <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="lg:overflow-y-auto space-y-4 custom-scrollbar">
                        {groups.map(group => (
                            <section key={group.status} aria-label={group.label}>
                                <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
                                    {group.label}<span className="text-xs font-normal text-gray-500">{group.notes.length}</span>
                                </h2>
                                <div className="divide-y divide-gray-700/40 rounded-lg border border-gray-700/50 bg-gray-800/20 overflow-hidden">
                                    {group.notes.map(renderRow)}
                                </div>
                            </section>
                        ))}
                    </div>

                    {selected && (
                        <aside
                            aria-label="Task detail"
                            className="hidden lg:flex lg:flex-col rounded-lg border border-gray-700/50 bg-gray-800/20 p-4"
                        >
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {STATUS_LABELS[statusOf(selected) ?? ''] ?? 'Task'}
                            </span>
                            <h2 className="mt-1 text-lg font-semibold text-white">{selected.title || 'Untitled Note'}</h2>
                            <p className="mt-3 text-sm text-gray-300 whitespace-pre-line line-clamp-[12]">
                                {getTextFromHtml(selected.content).trim() || 'No details yet.'}
                            </p>
                            {selected.properties.length > 0 && (
                                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                                    {selected.properties.map(property => (
                                        <React.Fragment key={property.key}>
                                            <dt className="text-gray-500">{property.key}</dt>
                                            <dd className="text-gray-200">{property.values.join(', ')}</dd>
                                        </React.Fragment>
                                    ))}
                                </dl>
                            )}
                            <div className="mt-auto pt-4">
                                <Button variant="secondary" size="sm" onClick={() => openNote(selected.id)}>
                                    Open note
                                </Button>
                            </div>
                        </aside>
                    )}
                </div>
            )}
        </div>
    );
}
