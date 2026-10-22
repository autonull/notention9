import React, {useEffect, useState, useMemo} from 'react';
import {Note, getTextFromHtml} from '@notention/core';
import {PlusIcon, ClockIcon, NoteIcon, SearchIcon, SettingsIcon, HomeIcon, MapIcon, NetworkIcon, ChatIcon, LightBulbIcon, OntologyIcon, TrashIcon, CpuChipIcon} from '../common/icons';
import {CommandPalette as CommandPalettePrimitive, CommandPaletteItem} from '../ui';
import {SHARED_COMMANDS} from '@notention/core';
import {cn} from '../../utils/ui';

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
        shortcut?: string;
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
                keywords: ['new', 'create', 'note', 'add', query.toLowerCase()],
            });
        }

        commands.forEach((cmd) => {
            const isNav = ['Dashboard', 'Notes', 'Map', 'Network', 'Ontology', 'Chat', 'Settings', 'Trash', 'Timeline', 'Actions', 'Sidebar', 'Help', 'Graph', 'Self'].some(v => cmd.label.includes(v));
            items.push({
                id: `cmd-${cmd.label}`,
                label: cmd.label,
                icon: cmd.icon,
                action: cmd.action,
                category: isNav ? 'Navigation' : 'Actions',
                shortcut: cmd.shortcut,
                keywords: cmd.label.toLowerCase().split(' '),
            });
        });

        // Always include all notes with enhanced keywords for tag/property search
        notes.forEach((note) => {
            const tagKeywords = note.tags.map(tag => `#${tag.toLowerCase()}`);
            const propertyKeywords = note.properties.flatMap(p =>
                p.values.map(v => `${p.key.toLowerCase()}:${v.toLowerCase()}`)
            );
            items.push({
                id: note.id,
                label: note.title || 'Untitled',
                description: getTextFromHtml(note.content).slice(0, 60),
                icon: <NoteIcon className="h-5 w-5"/>,
                action: () => onSelectNote(note.id),
                category: 'Notes',
                keywords: [
                    note.title.toLowerCase(),
                    ...tagKeywords,
                    ...propertyKeywords,
                ],
            });
        });

        return items;
    }, [notes, commands, onCreateNote, onSelectNote]);

    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, paletteItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (paletteItems[selectedIndex]) {
                    paletteItems[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    };

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