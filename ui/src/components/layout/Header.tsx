import React from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {Button, IconButton} from '../ui/Button';
import {BrandMark} from './BrandMark';
import {PlusIcon, SearchIcon, SettingsIcon} from '../ui/icons';
import {modShortcut} from '../../utils/platform';

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

    const actions = (
        <div className="ml-auto flex shrink-0 items-center gap-1">
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
