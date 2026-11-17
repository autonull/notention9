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
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
                    <TagIcon className="h-6 w-6 text-emerald-400"/>
                    Labels
                </h2>
                <p className="text-sm text-gray-400">
                    Manage tags across all your notes. Rename, merge, or delete labels.
                </p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
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

                <p className="text-xs text-gray-500 mb-4">
                    {sortedTags.length} label{sortedTags.length !== 1 ? 's' : ''} in use across {notes.length} note{notes.length !== 1 ? 's' : ''}
                </p>

                {sortedTags.length === 0 ? (
                    <EmptyState
                        variant="minimal"
                        icon={TagIcon}
                        title="No labels yet"
                        description={<>Create one above, or add a tag inline with <code className="text-blue-400">#tag</code> in a note.</>}
                    />
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {sortedTags.map(({tag, count}) => (
                            <div key={tag} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                                {editingTag === tag ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => handleRenameTag(tag, editValue)}
                                            onKeyDown={(e) => handleKeyDown(e, tag)}
                                            autoFocus
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => handleRenameTag(tag, editValue)} icon={CheckIcon} aria-label="Save"/>
                                        <Button variant="ghost" size="sm" onClick={handleCancelEdit} icon={XIcon} aria-label="Cancel"/>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <TagIcon className="w-5 h-5 text-emerald-400 flex-shrink-0"/>
                                            <span className="font-medium text-white truncate">#{tag}</span>
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300">
                                                {count} note{count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleStartEdit(tag)}
                                                aria-label={`Rename ${tag}`}
                                                className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                                            >
                                                <PencilIcon className="w-4 h-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteTag(tag)}
                                                aria-label={`Delete ${tag}`}
                                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
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

            <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/30">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Advanced</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                    For full ontology editing (custom attributes, types, relationships), use the
                    <button
                        onClick={() => setSettings(prev => ({...prev, activeView: 'ontology'}))}
                        className="text-blue-400 hover:underline"
                    >
                        Ontology Editor
                    </button>
                    .
                </p>
            </div>
        </div>
    );
}