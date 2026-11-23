import React, {useState, useMemo, useCallback} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {TagIcon, PencilIcon, TrashIcon, PlusIcon, CheckIcon, XIcon, CogIcon, ArrowRightIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {ConfirmationModal, EmptyState} from '../ui/Primitives';
import {SectionHeader} from '../ui/kit';

export function LabelsTab() {
    const {notes, updateNote, addNote} = useNotes();
    const {setActiveView, setSelectedNoteId, setSettingsTab} = useView();
    const {addToast} = useToast();

    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [tagToDelete, setTagToDelete] = useState<string | null>(null);

    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        notes.forEach(note => {
            note.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return counts;
    }, [notes]);

    const sortedTags = useMemo(() => {
        return Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([tag, count]) => ({tag, count}));
    }, [tagCounts]);

    const handleRenameTag = useCallback((oldTag: string, newTag: string) => {
        if (!newTag.trim() || newTag === oldTag) return;

        const normalizedNewTag = newTag.trim().toLowerCase();
        if (tagCounts[normalizedNewTag] && normalizedNewTag !== oldTag.toLowerCase()) {
            addToast(`#${normalizedNewTag} is already in use`, 'error');
            return;
        }

        notes.forEach(note => {
            if (note.tags.includes(oldTag)) {
                updateNote({
                    ...note,
                    tags: note.tags.map(t => t === oldTag ? normalizedNewTag : t),
                    updatedAt: new Date().toISOString()
                });
            }
        });

        addToast(`Renamed "${oldTag}" to "${normalizedNewTag}"`, 'success');
        setEditingTag(null);
    }, [notes, updateNote, tagCounts, addToast]);

    const handleDeleteTag = useCallback((tag: string) => {
        notes.forEach(note => {
            if (note.tags.includes(tag)) {
                updateNote({
                    ...note,
                    tags: note.tags.filter(t => t !== tag),
                    updatedAt: new Date().toISOString()
                });
            }
        });
        addToast(`Removed label #${tag}`, 'success');
    }, [notes, updateNote, addToast]);

    const handleCreateTag = () => {
        const tag = newTagInput.trim().toLowerCase().replace(/^#/, '');
        if (!tag) return;
        if (tagCounts[tag]) {
            addToast(`#${tag} is already in use`, 'error');
            return;
        }
        const note = addNote({title: '', content: '', tags: [tag]});
        setNewTagInput('');
        setActiveView('notes');
        setSelectedNoteId(note.id);
        addToast(`Created #${tag}. Write the note it belongs to.`, 'success');
    };

    const confirmDeleteTag = () => {
        if (tagToDelete) handleDeleteTag(tagToDelete);
        setTagToDelete(null);
    };

    const openOntology = () => {
        setActiveView('settings');
        setSettingsTab('ontology');
    };

    const handleStartEdit = (tag: string) => {
        setEditingTag(tag);
        setEditValue(tag);
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, tag: string) => {
        if (e.key === 'Enter') {
            handleRenameTag(tag, editValue);
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Labels"
                description="Rename, merge, or delete the tags that connect your notes."
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="flex flex-col gap-2">
                    <div className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-3">
                        <div className="flex items-center gap-2">
                            <Input
                                aria-label="New label"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                placeholder="New label, e.g. project"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                fullWidth={false}
                                wrapperClassName="min-w-0 flex-1"
                                className="h-[44px]"
                            />
                            <Button onClick={handleCreateTag} variant="primary" size="md" touchTarget={false} icon={PlusIcon} className="h-[44px] shrink-0">
                                Add
                            </Button>
                        </div>

                        <p className="mt-2 text-[11px] text-[var(--app-faint)]">
                            {sortedTags.length} label{sortedTags.length !== 1 ? 's' : ''} across {notes.length} note{notes.length !== 1 ? 's' : ''}. New labels open a page.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openOntology}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]"
                    >
                        <CogIcon className="h-3.5 w-3.5 shrink-0"/>
                        <span className="min-w-0 flex-1">Advanced: attributes, types, and relationships</span>
                        <ArrowRightIcon className="h-3.5 w-3.5 shrink-0"/>
                    </button>
                </div>

                <div className="lg:overflow-y-auto custom-scrollbar">
                    {sortedTags.length === 0 ? (
                        <EmptyState
                            variant="minimal"
                            icon={TagIcon}
                            title="No labels yet"
                            description={<>Create one, or add a tag inline with <code className="text-[var(--app-accent-text)]">#tag</code> in a note.</>}
                        />
                    ) : (
                        <div className="divide-y divide-[var(--app-line)] overflow-hidden rounded-lg border border-[var(--app-line)]">
                            {sortedTags.map(({tag, count}) => (
                                <div key={tag} className="flex items-center justify-between gap-3 bg-[var(--app-surface)] px-3 py-2">
                                    {editingTag === tag ? (
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => handleRenameTag(tag, editValue)}
                                                onKeyDown={(e) => handleKeyDown(e, tag)}
                                                autoFocus
                                                className="h-8 flex-1 rounded-md border border-[var(--app-line)] bg-[var(--app-surface)] px-2 text-[13px] text-[var(--app-text)] focus:border-[var(--app-accent-line)] focus:outline-none"
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => handleRenameTag(tag, editValue)} icon={CheckIcon} aria-label="Save"/>
                                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} icon={XIcon} aria-label="Cancel"/>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <TagIcon className="h-3.5 w-3.5 shrink-0 text-[var(--app-faint)]"/>
                                                <span className="truncate text-[13px] font-medium text-[var(--app-text-secondary)]">#{tag}</span>
                                                <span className="rounded-md border border-[var(--app-line)] bg-[var(--app-raised)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--app-muted)]">
                                                    {count} note{count !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleStartEdit(tag)}
                                                    aria-label={`Rename ${tag}`}
                                                    className="text-[var(--app-muted)]"
                                                >
                                                    <PencilIcon className="w-4 h-4"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setTagToDelete(tag)}
                                                    aria-label={`Delete ${tag}`}
                                                    className="text-[var(--app-muted)] hover:text-red-400"
                                                >
                                                    <TrashIcon className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!tagToDelete}
                onClose={() => setTagToDelete(null)}
                onConfirm={confirmDeleteTag}
                title={`Remove #${tagToDelete ?? ''}?`}
                message={`This removes the label from ${tagToDelete ? (tagCounts[tagToDelete] ?? 0) : 0} note${tagToDelete && tagCounts[tagToDelete] === 1 ? '' : 's'}. The notes stay.`}
                confirmLabel="Remove label"
                isDestructive
            />
        </div>
    );
}