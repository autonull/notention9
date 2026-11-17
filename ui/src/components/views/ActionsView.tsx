import React from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../ui/Button';
import {Note, getTextFromHtml} from '@notention/core';
import {Skeleton} from '../ui/Skeleton';
import {LightBulbIcon} from '../ui/icons';
import {EmptyState} from '../ui/Primitives';

export function ActionsView() {
    const {notes, loading, addNote} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();

    if (loading) {
        return (
            <div className="h-full bg-gray-900 p-4 flex flex-col overflow-y-auto text-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LightBulbIcon className="w-6 h-6 text-yellow-400"/> Actions
                    </h1>
                    <Button variant="primary" disabled>+ New Task</Button>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 text-gray-300">RUNNING</h2>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 text-gray-300">QUEUED</h2>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 text-gray-300">COMPLETED</h2>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                    <Skeleton variant="rectangular" height={80} width="100%" className="rounded-lg p-3 mb-2"/>
                </div>
            </div>
        );
    }

    const byStatus = (status: string) =>
        notes.filter(n => n.properties.some(p => p.key === 'status' && p.values.includes(status)));

    const runningNotes = byStatus('running');
    const todoNotes = byStatus('todo');
    const completedNotes = byStatus('completed');

    const handleNoteClick = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const handleNewTask = () => {
        const note = addNote({
            title: 'New Task',
            properties: [{key: 'status', operator: 'is', values: ['todo']}],
            tags: ['task'],
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    };

    const renderNoteCard = (note: Note) => {
        const title = note.title || 'Untitled Note';
        const preview = getTextFromHtml(note.content).trim().slice(0, 100);
        const details = note.properties.filter(property => property.key !== 'status');
        return (
            <button
                key={note.id}
                onClick={() => handleNoteClick(note.id)}
                className="w-full px-3 py-2.5 text-left hover:bg-gray-800/60 transition-colors"
            >
                <div className="font-semibold truncate">{title}</div>
                {preview && preview !== title && (
                    <div className="text-sm text-gray-400 mt-0.5 line-clamp-1">{preview}</div>
                )}
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
            </button>
        );
    };

    const sections = [
        {title: 'Running', notes: runningNotes},
        {title: 'Todo', notes: todoNotes},
        {title: 'Completed', notes: completedNotes},
    ];
    const isEmpty = sections.every(section => section.notes.length === 0);

    return (
        <div className="h-full bg-gray-900 p-4 flex flex-col overflow-y-auto text-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <LightBulbIcon className="w-6 h-6 text-yellow-400"/> Actions
                </h1>
                <Button variant="primary" onClick={handleNewTask}>
                    + New Task
                </Button>
            </div>

            {isEmpty ? (
                <EmptyState
                    title="No actions yet"
                    description="Tasks and automations appear here once a note has a status."
                    action={<Button variant="primary" onClick={handleNewTask}>Create a task</Button>}
                />
            ) : (
                <div className="space-y-6">
                    {sections.filter(section => section.notes.length > 0).map(section => (
                        <section key={section.title} aria-label={section.title}>
                            <h2 className="text-lg font-bold mb-2 text-gray-300">{section.title.toUpperCase()} ({section.notes.length})</h2>
                            <div className="divide-y divide-gray-700/40 rounded-lg border border-gray-700/50 bg-gray-800/20 overflow-hidden">
                                {section.notes.map(renderNoteCard)}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
