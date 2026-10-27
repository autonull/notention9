import React from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {Note} from '@notention/core';
import {Skeleton} from '../ui/Skeleton';

export function ActionsView() {
    const {notes, loading, addNote} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();

    if (loading) {
        return (
            <div className="h-full bg-gray-900 p-4 flex flex-col overflow-y-auto text-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-yellow-400">⚡</span> Actions
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
    const queuedNotes = byStatus('queued');
    const completedNotes = byStatus('completed');

    const handleNoteClick = (id: string) => {
        setSelectedNoteId(id);
        setActiveView('notes');
    };

    const handleNewTask = () => {
        const note = addNote({
            title: 'New Task',
            properties: [{key: 'status', operator: 'is', values: ['queued']}],
            tags: ['task'],
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    };

    const renderNoteCard = (note: Note) => (
        <Card key={note.id} className="mb-2 p-3 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => handleNoteClick(note.id)}>
            <div className="font-semibold">{note.title || 'Untitled Note'}</div>
            <div className="text-sm text-gray-400 mt-1 truncate">{note.content.slice(0, 100)}</div>
        </Card>
    );

    return (
        <div className="h-full bg-gray-900 p-4 flex flex-col overflow-y-auto text-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <span className="text-yellow-400">⚡</span> Actions
                </h1>
                <Button variant="primary" onClick={handleNewTask}>
                    + New Task
                </Button>
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 text-gray-300">RUNNING ({runningNotes.length})</h2>
                {runningNotes.length > 0 ? (
                    runningNotes.map(renderNoteCard)
                ) : (
                    <div className="text-gray-500 italic p-4 bg-gray-800 rounded-lg">No active tasks.</div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 text-gray-300">QUEUED ({queuedNotes.length})</h2>
                {queuedNotes.length > 0 ? (
                    queuedNotes.map(renderNoteCard)
                ) : (
                    <div className="text-gray-500 italic p-4 bg-gray-800 rounded-lg">No queued tasks.</div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 text-gray-300">COMPLETED ({completedNotes.length})</h2>
                {completedNotes.length > 0 ? (
                    completedNotes.map(renderNoteCard)
                ) : (
                    <div className="text-gray-500 italic p-4 bg-gray-800 rounded-lg">No completed tasks.</div>
                )}
            </div>
        </div>
    );
}
