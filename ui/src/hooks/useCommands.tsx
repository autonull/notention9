import React from 'react';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';
import {
    ChatIcon,
    CodeBracketsIcon,
    DocumentDuplicateIcon,
    DownloadIcon,
    HelpIcon,
    HomeIcon,
    MapIcon,
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
    const {settings, setSettings} = useSettings();
    const {addToast} = useToast();

    const handleNewNote = () => {
        const newNote = addNote();
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
    };

    const commands = [
        {
            label: 'New Note',
            icon: <PlusIcon className="h-5 w-5"/>,
            action: handleNewNote
        },
        {
            label: isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
            icon: <SidebarIcon className="h-5 w-5"/>,
            action: () => setIsSidebarOpen(!isSidebarOpen)
        },
        {
            label: 'Go to Dashboard',
            icon: <HomeIcon className="h-5 w-5"/>,
            action: () => setActiveView('dashboard')
        },
        {
            label: 'Go to Notes',
            icon: <span className="h-5 w-5 text-center">📝</span>,
            action: () => setActiveView('notes')
        },
        {
            label: 'Go to Map',
            icon: <MapIcon className="h-5 w-5"/>,
            action: () => setActiveView('map')
        },
        {
            label: 'Go to Network',
            icon: <NetworkIcon className="h-5 w-5"/>,
            action: () => setActiveView('network')
        },
        {
            label: 'Go to Ontology',
            icon: <OntologyIcon className="h-5 w-5"/>,
            action: () => setActiveView('ontology')
        },
        {
            label: 'Go to Chat',
            icon: <ChatIcon className="h-5 w-5"/>,
            action: () => setActiveView('chat')
        },
        {
            label: 'Go to Settings',
            icon: <SettingsIcon className="h-5 w-5"/>,
            action: () => setActiveView('settings')
        },
        {
            label: 'Go to Trash',
            icon: <TrashIcon className="h-5 w-5"/>,
            action: () => setActiveView('trash')
        },
        {
            label: 'Open Help & Shortcuts',
            icon: <HelpIcon className="h-5 w-5"/>,
            action: () => setIsHelpOpen(true)
        },
        {
            label: settings.developerMode ? 'Disable Developer Mode' : 'Enable Developer Mode',
            icon: <CodeBracketsIcon className="h-5 w-5"/>,
            action: () => setSettings((s) => ({...s, developerMode: !s.developerMode}))
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

    // Simulator view is removed, functionality moved to Chat

    return {commands, handleNewNote};
}
