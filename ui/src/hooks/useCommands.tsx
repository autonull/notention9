import React from 'react';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useToast} from './useToast';
import {SHARED_COMMANDS} from '@notention/core';
import {buildSingleNoteExport} from '@notention/core';
import {
    ChatIcon,
    ClockIcon,
    DocumentDuplicateIcon,
    DownloadIcon,
    HelpIcon,
    HomeIcon,
    MapIcon,
    LightBulbIcon,
    NetworkIcon,
    NoteIcon,
    OntologyIcon,
    PlusIcon,
    SettingsIcon,
    SidebarIcon,
    TrashIcon,
    GitBranchIcon,
    UsersIcon
} from '../components/common/icons';

interface UseCommandsProps {
    setIsHelpOpen: (isOpen: boolean) => void;
}

export function useCommands({setIsHelpOpen}: UseCommandsProps) {
    const {notes, addNote} = useNotes();
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        isSidebarOpen,
        setIsSidebarOpen,
    } = useView();
    const {addToast} = useToast();

    const handleNewNote = () => {
        const newNote = addNote();
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    };

    const commands = [
        {
            ...SHARED_COMMANDS.NEW_NOTE,
            icon: <PlusIcon className="h-5 w-5"/>,
            action: handleNewNote,
            shortcut: 'Ctrl+N',
        },
        {
            label: isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
            icon: <SidebarIcon className="h-5 w-5"/>,
            action: () => setIsSidebarOpen(!isSidebarOpen),
            shortcut: 'Ctrl+\\',
        },
        {
            ...SHARED_COMMANDS.DASHBOARD,
            icon: <HomeIcon className="h-5 w-5"/>,
            action: () => setActiveView('dashboard'),
            shortcut: 'Ctrl+1',
        },
        {
            ...SHARED_COMMANDS.NOTES_LIST,
            icon: <NoteIcon className="h-5 w-5"/>,
            action: () => setActiveView('notes'),
            shortcut: 'Ctrl+2',
        },
        {
            ...SHARED_COMMANDS.MAP,
            icon: <MapIcon className="h-5 w-5"/>,
            action: () => setActiveView('map'),
            shortcut: 'Ctrl+3',
        },
        {
            ...SHARED_COMMANDS.TIMELINE,
            icon: <ClockIcon className="h-5 w-5"/>,
            action: () => setActiveView('timeline'),
            shortcut: 'Ctrl+4',
        },
        {
            label: 'Go to Actions',
            icon: <LightBulbIcon className="h-5 w-5"/>,
            action: () => setActiveView('actions'),
            shortcut: 'Ctrl+5',
        },
        {
            ...SHARED_COMMANDS.NETWORK,
            icon: <NetworkIcon className="h-5 w-5"/>,
            action: () => setActiveView('network'),
            shortcut: 'Ctrl+6',
        },
        {
            ...SHARED_COMMANDS.CHAT,
            icon: <ChatIcon className="h-5 w-5"/>,
            action: () => setActiveView('chat'),
            shortcut: 'Ctrl+7',
        },
        {
            label: 'Go to Graph',
            icon: <GitBranchIcon className="h-5 w-5"/>,
            action: () => setActiveView('graph'),
            shortcut: 'Ctrl+8',
        },
        {
            ...SHARED_COMMANDS.ONTOLOGY,
            icon: <OntologyIcon className="h-5 w-5"/>,
            action: () => setActiveView('ontology'),
            shortcut: 'Ctrl+9',
        },
        {
            label: 'Go to Self',
            icon: <UsersIcon className="h-5 w-5"/>,
            action: () => setActiveView('self'),
            shortcut: 'Ctrl+0',
        },
        {
            ...SHARED_COMMANDS.TRASH,
            icon: <TrashIcon className="h-5 w-5"/>,
            action: () => setActiveView('trash'),
        },
        {
            ...SHARED_COMMANDS.SETTINGS,
            icon: <SettingsIcon className="h-5 w-5"/>,
            action: () => setActiveView('settings'),
            shortcut: 'Ctrl+,',
        },
        {
            ...SHARED_COMMANDS.HELP,
            label: 'Open Help & Shortcuts',
            icon: <HelpIcon className="h-5 w-5"/>,
            action: () => setIsHelpOpen(true),
            shortcut: '?',
        },
    ];

    if (activeView === 'notes' && selectedNoteId) {
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
            shortcut: 'Ctrl+S',
        });
    }

    return {commands, handleNewNote};
}