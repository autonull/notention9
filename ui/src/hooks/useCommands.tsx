import React from 'react';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useToast} from './useToast';
import {SHARED_COMMANDS} from '@notention/core';
import {buildSingleNoteExport} from '@notention/core';
import {
    DocumentDuplicateIcon,
    DownloadIcon,
    HelpIcon,
    PlusIcon,
} from '../components/ui/icons';
import {modShortcut} from '../utils/platform';

interface UseCommandsProps {
    setIsHelpOpen: (isOpen: boolean) => void;
}

interface PaletteCommand {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    shortcut?: string;
}

export function useCommands({setIsHelpOpen}: UseCommandsProps) {
    const {notes, addNote} = useNotes();
    const {
        selectedNoteId,
        setSelectedNoteId,
        setActiveView,
    } = useView();
    const {addToast} = useToast();

    const handleNewNote = () => {
        const newNote = addNote();
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    };

    const commands: PaletteCommand[] = [
        {
            ...SHARED_COMMANDS.NEW_NOTE,
            icon: <PlusIcon className="h-5 w-5"/>,
            action: handleNewNote,
            shortcut: modShortcut('N'),
        },
        {
            ...SHARED_COMMANDS.HELP,
            label: 'Open Help & Shortcuts',
            icon: <HelpIcon className="h-5 w-5"/>,
            action: () => setIsHelpOpen(true),
            shortcut: '?',
        },
    ];

    if (selectedNoteId) {
        commands.push({
            label: 'Copy Note ID',
            icon: <DocumentDuplicateIcon className="h-5 w-5"/>,
            action: () => {
                navigator.clipboard.writeText(selectedNoteId);
                addToast('Note ID copied to clipboard', 'success');
            },
            shortcut: 'Ctrl+Shift+C',
        });
        commands.push({
            label: 'Download Note JSON',
            icon: <DownloadIcon className="h-5 w-5"/>,
            action: () => {
                const note = notes.find(n => n.id === selectedNoteId);
                if (note) {
                    const blob = new Blob([JSON.stringify(buildSingleNoteExport(note), null, 2)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `note-${note.title || 'untitled'}-${note.id.slice(0, 8)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    addToast('Note downloaded', 'success');
                }
            },
        });
    }

    return {commands, handleNewNote};
}
