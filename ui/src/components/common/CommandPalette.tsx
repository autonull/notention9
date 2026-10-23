import React, {useCallback, useMemo, useState} from 'react';
import {Note, getTextFromHtml} from '@notention/core';
import {PlusIcon, NoteIcon} from '../common/icons';
import {EnhancedCommandPalette} from '../ui/EnhancedCommandPalette';
import {CommandPaletteItem} from '../ui/Overlay';
import {useLocalForage} from '../../hooks/useLocalForage';

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

const RECENT_STORAGE_KEY = 'command-palette-recent';

export function CommandPalette({
    isOpen,
    onClose,
    notes,
    onSelectNote,
    onCreateNote,
    commands,
}: CommandPaletteProps) {
    const [recentItems, setRecentItems] = useLocalForage<CommandPaletteItem[]>(RECENT_STORAGE_KEY, []);
    const [lastQuery, setLastQuery] = useState('');

    const paletteItems = useMemo((): CommandPaletteItem[] => {
        const items: CommandPaletteItem[] = [];

        if (lastQuery && onCreateNote) {
            items.push({
                id: 'create-note',
                label: `Create new note: "${lastQuery}"`,
                description: 'Create a new note with this title',
                icon: <PlusIcon className="h-5 w-5"/>,
                action: () => onCreateNote(lastQuery),
                category: 'Actions',
                shortcut: 'Enter',
                keywords: ['new', 'create', 'note', 'add', lastQuery.toLowerCase()],
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
    }, [notes, commands, onCreateNote, onSelectNote, lastQuery]);

    const handleClose = useCallback(() => {
        onClose();
        setLastQuery('');
    }, [onClose]);

    return (
        <EnhancedCommandPalette
            isOpen={isOpen}
            onClose={handleClose}
            items={paletteItems}
            placeholder="Type a command or search notes... (#tag, key:value)"
            title="Command Palette"
            showShortcuts={true}
            showRecent={true}
            recentItems={recentItems}
            maxRecent={5}
            onRecentChange={setRecentItems}
            fuzzySearch={true}
        />
    );
}