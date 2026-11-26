import React, { useState, useEffect, useRef } from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {Button, IconButton} from '../ui/Button';
import {BrandMark} from './BrandMark';
import {PlusIcon, SearchIcon, SettingsIcon, HelpCircleIcon} from '../ui/icons';
import {modShortcut} from '../../utils/platform';
import {cn} from '../../utils/ui';

export function Header() {
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        setIsPaletteOpen,
        notesMode,
    } = useView();
    const {notes, addNote} = useNotes();

    const openNotes = () => {
        setActiveView('notes');
        setSelectedNoteId(null);
    };

    const openSearch = () => {
        window.dispatchEvent(new CustomEvent('open-search'));
        setIsPaletteOpen(true);
    };

    const createNote = () => {
        const note = addNote({title: '', content: ''});
        setActiveView('notes');
        setSelectedNoteId(note.id);
    };

    if (selectedNoteId) return null;

    const activeCount = notes.filter(note => !note.deletedAt).length;
    const isFirstRun = activeView === 'notes' && notes.length === 0;
    const notesAreTheTask = activeView === 'notes' && notesMode !== 'map';

    const [helpMenuOpen, setHelpMenuOpen] = useState(false);

    const openHelp = () => {
        window.dispatchEvent(new CustomEvent('action:openHelp'));
        setHelpMenuOpen(false);
    };

    const openHelpTopic = (topicId: string) => {
        window.dispatchEvent(new CustomEvent('action:openHelpTopic', { detail: { topicId } }));
        setHelpMenuOpen(false);
    };

    const helpMenuItems = [
        { id: 'help.open', label: 'Help Center', action: openHelp, shortcut: '⌘H' },
        { id: 'help.topic.create-first-note', label: 'Create Your First Note', action: () => openHelpTopic('create-first-note') },
        { id: 'help.topic.tags-and-filters', label: 'Tags & Filters', action: () => openHelpTopic('tags-and-filters') },
        { id: 'help.topic.connect-network', label: 'Connect to Network', action: () => openHelpTopic('connect-network') },
        { id: 'help.topic.use-map', label: 'Use Map View', action: () => openHelpTopic('use-map') },
        { id: 'help.topic.use-timeline', label: 'Use Timeline', action: () => openHelpTopic('use-timeline') },
        { id: 'help.topic.semantic-matching', label: 'Semantic Matching', action: () => openHelpTopic('semantic-matching') },
        { id: 'help.topic.chat-basics', label: 'Chat Basics', action: () => openHelpTopic('chat-basics') },
        { id: 'help.topic.skills-and-ontology', label: 'Skills & Ontology', action: () => openHelpTopic('skills-and-ontology') },
        { id: 'help.topic.describe-it-basics', label: 'Describe It', action: () => openHelpTopic('describe-it-basics') },
        { id: 'help.shortcuts', label: 'Keyboard Shortcuts', action: () => window.dispatchEvent(new CustomEvent('action:openShortcutsHelp')), shortcut: '?' },
    ];

    const helpMenuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setHelpMenuOpen(false);
            }
        };
        if (helpMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [helpMenuOpen]);

    const actions = (
        <div className="ml-auto flex shrink-0 items-center gap-1 relative">
            <IconButton
                onClick={openSearch}
                tooltip={`Search (${modShortcut('K')})`}
                tooltipPosition="bottom"
                icon={SearchIcon}
                variant="ghost"
                size="sm"
                aria-label="Search notes, details, tags, and commands"
            />
            {!isFirstRun && (
                <Button
                    type="button"
                    onClick={createNote}
                    aria-label="New note"
                    variant={notesAreTheTask ? 'primary' : 'secondary'}
                    size="sm"
                    touchTarget={false}
                    className="gap-1.5 px-2.5"
                >
                    <PlusIcon className="h-4 w-4"/>
                    <span className="hidden md:inline">New note</span>
                </Button>
            )}
            <div className="relative">
                <IconButton
                    onClick={() => setHelpMenuOpen(!helpMenuOpen)}
                    tooltip="Help (⌘H)"
                    tooltipPosition="bottom"
                    icon={HelpCircleIcon}
                    variant="ghost"
                    size="sm"
                    aria-label="Help menu"
                    aria-expanded={helpMenuOpen}
                    aria-haspopup="true"
                />
                {helpMenuOpen && (
                    <div 
                        ref={helpMenuRef}
                        className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)] overflow-hidden animate-slide-in-down"
                        role="menu"
                        data-testid="help-menu"
                    >
                        {helpMenuItems.map((item, index) => (
                            <button
                                key={item.id}
                                onClick={item.action}
                                role="menuitem"
                                tabIndex={-1}
                                className={cn(
                                    'w-full px-3 py-2 text-left text-sm',
                                    'text-[var(--app-text)] hover:bg-[var(--app-raised)] transition-colors',
                                    'flex items-center justify-between gap-2'
                                )}
                                data-testid={`help-menu-${item.id}`}
                            >
                                <span>{item.label}</span>
                                {item.shortcut && (
                                    <kbd className="text-xs text-[var(--app-muted)] font-mono px-1.5 py-0.5 rounded bg-[var(--app-surface)] border border-[var(--app-line)]">
                                        {item.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <IconButton
                onClick={() => setActiveView('settings')}
                tooltip="Settings"
                tooltipPosition="bottom"
                icon={SettingsIcon}
                variant="ghost"
                size="sm"
                isActive={activeView === 'settings'}
                aria-label="Settings"
            />
        </div>
    );

    if (activeView === 'settings') {
        return (
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)] px-3 md:px-4">
                <BrandMark onClick={openNotes} label="Notention — back to notes"/>
                <button
                    type="button"
                    onClick={openNotes}
                    className="text-[13px] font-medium text-[var(--app-muted)] transition-colors hover:text-[var(--app-text)]"
                >
                    Notes
                </button>
                <span aria-hidden="true" className="text-[11px] text-[var(--app-faint)]">/</span>
                <h1 className="text-[14px] font-semibold text-[var(--app-text)]">Settings</h1>
                {actions}
            </header>
        );
    }

    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)] px-3 md:px-4">
            <BrandMark onClick={openNotes}/>
            <h1 className="text-[13px] font-semibold text-[var(--app-text)]">Notes</h1>
            {activeCount > 0 && (
                <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{activeCount}</span>
            )}
            {actions}
        </header>
    );
}
