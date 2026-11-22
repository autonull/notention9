import React, {useState, useMemo, useCallback} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useToast} from '../../hooks/useToast';
import {TagIcon, PencilIcon, TrashIcon, PlusIcon, CheckIcon, XIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {EmptyState} from '../ui/Primitives';

export function LabelsTab() {
    const {notes, updateNote} = useNotes();
    const {settings, setSettings} = useSettings();
    const {addToast} = useToast();

    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newTagInput, setNewTagInput] = useState('');

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
            addToast(`Tag "${normalizedNewTag}" already exists`, 'error');
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
        addToast(`Deleted tag "${tag}"`, 'success');
    }, [notes, updateNote, addToast]);

    const handleCreateTag = () => {
        const tag = newTagInput.trim().toLowerCase();
        if (!tag) return;
        if (tagCounts[tag]) {
            addToast(`Tag "${tag}" already exists`, 'error');
            return;
        }
        addToast(`Created tag "${tag}". It will appear when used in a note.`, 'success');
        setNewTagInput('');
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
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col gap-2 shrink-0">
                <h2 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-[var(--app-text)]">
                    <TagIcon className="h-4 w-4 text-[var(--app-accent-text)]"/>
                    Labels
                </h2>
                <p className="text-[12px] text-[var(--app-muted)]">
                    Rename, merge, or delete the tags that connect your notes.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-4">
                        <div className="flex gap-2 items-center mb-4">
                            <div className="flex-1">
                                <Input
                                    label="Create new label"
                                    value={newTagInput}
                                    onChange={(e) => setNewTagInput(e.target.value)}
                                    placeholder="e.g. project, urgent, personal"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                />
                            </div>
                            <Button onClick={handleCreateTag} variant="primary" icon={PlusIcon}>
                                Add
                            </Button>
                        </div>

                        <p className="text-[11px] text-[var(--app-faint)]">
                            {sortedTags.length} label{sortedTags.length !== 1 ? 's' : ''} in use across {notes.length} note{notes.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="rounded-lg border border-dashed border-[var(--app-line)] p-3">
                        <h3 className="mb-1 text-[12px] font-medium text-[var(--app-text-secondary)]">Advanced</h3>
                        <p className="text-[11px] leading-5 text-[var(--app-muted)]">
                            For full ontology editing (custom attributes, types, relationships), use the{' '}
                            <button
                                onClick={() => setSettings(prev => ({...prev, activeView: 'ontology'}))}
                                className="text-[var(--app-accent-text)] hover:underline"
                            >
                                Ontology Editor
                            </button>
                            .
                        </p>
                    </div>
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
                        <div className="space-y-1.5">
                            {sortedTags.map(({tag, count}) => (
                                <div key={tag} className="flex items-center justify-between rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-2">
                                    {editingTag === tag ? (
                                        <div className="flex-1 flex items-center gap-2">
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
                                                    onClick={() => handleDeleteTag(tag)}
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
        </div>
    );
}