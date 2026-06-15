import React from 'react';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useToast} from './useToast';
import {SHARED_COMMANDS} from '@notention/core';
import {
    ChatIcon,
    DocumentDuplicateIcon,
    DownloadIcon,
    HelpIcon,
    HomeIcon,
    MapIcon,
    LightBulbIcon,
    NetworkIcon,
    OntologyIcon,
    PlusIcon,
    SettingsIcon,
    SidebarIcon,
    TrashIcon
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

    const commands: any[] = [
        {
            ...SHARED_COMMANDS.NEW_NOTE,
            icon: <PlusIcon className="h-5 w-5"/>,
            action: handleNewNote
        },
        {
            label: isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
            icon: <SidebarIcon className="h-5 w-5"/>,
            action: () => setIsSidebarOpen(!isSidebarOpen)
        },
        {
            ...SHARED_COMMANDS.DASHBOARD,
            icon: <HomeIcon className="h-5 w-5"/>,
            action: () => setActiveView('dashboard')
        },
        {
            ...SHARED_COMMANDS.NOTES_LIST,
            icon: <span className="h-5 w-5 text-center">📝</span>,
            action: () => setActiveView('notes')
        },
        {
            ...SHARED_COMMANDS.MAP,
            icon: <MapIcon className="h-5 w-5"/>,
            action: () => setActiveView('map')
        },
        {
            label: 'Go to Actions',
            icon: <LightBulbIcon className="h-5 w-5"/>,
            action: () => setActiveView('actions')
        },
        {
            ...SHARED_COMMANDS.NETWORK,
            icon: <NetworkIcon className="h-5 w-5"/>,
            action: () => setActiveView('network')
        },
        {
            ...SHARED_COMMANDS.ONTOLOGY,
            icon: <OntologyIcon className="h-5 w-5"/>,
            action: () => setActiveView('ontology')
        },
        {
            ...SHARED_COMMANDS.CHAT,
            icon: <ChatIcon className="h-5 w-5"/>,
            action: () => setActiveView('chat')
        },
        {
            ...SHARED_COMMANDS.SETTINGS,
            icon: <SettingsIcon className="h-5 w-5"/>,
            action: () => setActiveView('settings')
        },
        {
            ...SHARED_COMMANDS.TRASH,
            icon: <TrashIcon className="h-5 w-5"/>,
            action: () => setActiveView('trash')
        },
        {
            ...SHARED_COMMANDS.HELP,
            label: 'Open Help & Shortcuts',
            icon: <HelpIcon className="h-5 w-5"/>,
            action: () => setIsHelpOpen(true)
        },
    ];

    if (activeView === 'notes' && selectedNoteId) {
        commands.push({
            label: 'Copy Note ID',
            icon: <DocumentDuplicateIcon className="h-5 w-5"/>,
            action: () => {
                navigator.clipboard.writeText(selectedNoteId);
                addToast('Note ID copied to clipboard', 'success');
            }
        });
        commands.push({
            label: 'Download Note JSON',
            icon: <DownloadIcon className="h-5 w-5"/>,
            action: () => {
                const note = notes.find(n => n.id === selectedNoteId);
                if (note) {
                    const blob = new Blob([JSON.stringify(note, null, 2)], {type: 'application/json'});
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
            }
        });
    }

    return {commands, handleNewNote};
}
