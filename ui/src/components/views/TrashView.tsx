import React, {useMemo} from 'react';
import {getTextFromHtml, type Note} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {Button} from '../common/Button';
import {EmptyState} from '../common/EmptyState';
import {TrashIcon, DocumentDuplicateIcon} from '../common/icons';

export function TrashView() {
    const {notes, restoreNote, permanentlyDeleteNote} = useNotes();
    const {addToast} = useToast();

    const deletedNotes = useMemo(
        () => notes.filter(note => note.deletedAt).sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')),
        [notes]
    );

    const handleRestore = (note: Note) => {
        restoreNote(note.id);
        addToast('Note restored', 'success');
    };

    const handleDelete = (note: Note) => {
        if (window.confirm(`Permanently delete "${note.title || 'Untitled Note'}"? This cannot be undone.`)) {
            permanentlyDeleteNote(note.id);
            addToast('Note permanently deleted', 'success');
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-8 custom-scrollbar" data-testid="trash-view">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-xl bg-red-500/10 p-2.5 text-red-400">
                        <TrashIcon className="h-6 w-6"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Recently deleted</h1>
                        <p className="text-sm text-gray-500">Restore a note or delete it permanently. Deleted notes are never removed automatically.</p>
                    </div>
                </div>

                {deletedNotes.length === 0 ? (
                    <EmptyState
                        icon={TrashIcon}
                        title="Trash is empty"
                        description="Notes you delete appear here until you restore or permanently remove them."
                    />
                ) : (
                    <div className="space-y-2">
                        {deletedNotes.map(note => (
                            <div key={note.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-semibold text-gray-200">{note.title || 'Untitled Note'}</div>
                                    <div className="mt-1 truncate text-sm text-gray-500">{getTextFromHtml(note.content) || 'No content'}</div>
                                    <div className="mt-1 text-xs text-gray-600">
                                        Deleted {note.deletedAt ? new Date(note.deletedAt).toLocaleString() : 'recently'}
                                    </div>
                                </div>
                                <Button variant="secondary" size="sm" icon={DocumentDuplicateIcon} onClick={() => handleRestore(note)}>
                                    Restore
                                </Button>
                                <Button variant="danger" size="sm" icon={TrashIcon} onClick={() => handleDelete(note)}>
                                    Delete forever
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
