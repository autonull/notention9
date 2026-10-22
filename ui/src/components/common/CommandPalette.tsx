import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Note, getTextFromHtml} from '@notention/core';
import {PlusIcon, ClockIcon, NoteIcon, SearchIcon} from '../common/icons';
import {useListNavigation} from '../../hooks/useListNavigation';
import {CommandPalette as CommandPalettePrimitive, CommandPaletteItem} from '../ui';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    onSelectNote: (noteId: string) => void;
    onCreateNote?: (title: string) => void;
    commands: {
        label: string;
        icon: React.ReactElement;
        action: () => void;
    }[];
}

export function CommandPalette({
                                    isOpen,
                                    onClose,
                                    notes,
                                    onSelectNote,
                                    onCreateNote,
                                    commands,
                                }: CommandPaletteProps) {
    const [query, setQuery] = useState('');

    const paletteItems = useMemo((): CommandPaletteItem[] => {
        const items: CommandPaletteItem[] = [];

        if (query && onCreateNote) {
            items.push({
                id: 'create-note',
                label: `Create new note: "${query}"`,
                description: 'Create a new note with this title',
                icon: <PlusIcon className="h-5 w-5"/>,
                action: () => onCreateNote(query),
                category: 'Actions',
                shortcut: 'Enter',
            });
        }

        commands.forEach((cmd) => {
            const isNav = ['Dashboard', 'Notes', 'Map', 'Network', 'Ontology', 'Chat', 'Settings', 'Trash', 'Timeline', 'Actions', 'Sidebar', 'Help'].some(v => cmd.label.includes(v));
            items.push({
                id: `cmd-${cmd.label}`,
                label: cmd.label,
                icon: cmd.icon,
                action: cmd.action,
                category: isNav ? 'Navigation' : 'Actions',
                shortcut: cmd.label.includes('Ctrl') ? cmd.label.match(/Ctrl\+[A-Z]/)?.[0] : undefined,
            });
        });

        if (!query) {
            notes.slice(0, 5).forEach((note) => {
                items.push({
                    id: `recent-${note.id}`,
                    label: note.title || 'Untitled',
                    description: note.content.slice(0, 60).replace(/<[^>]*>/g, ''),
                    icon: <ClockIcon className="h-5 w-5"/>,
                    action: () => onSelectNote(note.id),
                    category: 'Recent Notes',
                });
            });
        }

        if (query) {
            const filteredNotes = notes
                .filter((note) => {
                    const q = query.toLowerCase();

                    if (q.startsWith('#')) {
                        const tagQuery = q.slice(1);
                        return note.tags.some(tag => tag.toLowerCase().includes(tagQuery));
                    }

                    if (q.includes(':')) {
                        const [key, value] = q.split(':').map(s => s.trim());
                        if (key && value) {
                            return note.properties.some(p =>
                                p.key.toLowerCase().includes(key) &&
                                p.values.some(v => v.toLowerCase().includes(value))
                            );
                        }
                        if (key && !value) {
                            return note.properties.some(p => p.key.toLowerCase().includes(key));
                        }
                    }

                    return (
                        note.title.toLowerCase().includes(q) ||
                        note.content.toLowerCase().includes(q)
                    );
                })
                .slice(0, 10);

            filteredNotes.forEach((note) => {
                items.push({
                    id: note.id,
                    label: note.title || 'Untitled',
                    description: getTextFromHtml(note.content).slice(0, 60),
                    icon: <NoteIcon className="h-5 w-5"/>,
                    action: () => onSelectNote(note.id),
                    category: 'Notes',
                });
            });
        }

        return items;
    }, [query, notes, commands, onCreateNote, onSelectNote]);

    const {selectedIndex, setSelectedIndex, handleKeyDown} = useListNavigation({
        itemCount: paletteItems.length,
        onSelect: (index) => {
            if (paletteItems[index]) {
                paletteItems[index].action();
                onClose();
            }
        },
        onClose,
    });

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => {
                const input = document.querySelector('[data-cmd-input]') as HTMLInputElement;
                input?.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <CommandPalettePrimitive
            isOpen={isOpen}
            onClose={onClose}
            items={paletteItems}
            placeholder="Type a command or search notes..."
            title="Command Palette"
        />
    );
}