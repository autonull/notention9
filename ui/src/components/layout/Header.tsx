import React from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {IconButton} from '../ui/Button';
import {Segmented} from '../ui/kit';
import {BrandMark} from './BrandMark';
import {PlusIcon, SearchIcon, SettingsIcon} from '../ui/icons';
import {modShortcut} from '../../utils/platform';
import {cn} from '../../utils/ui';
import {NOTE_MODES, NOTE_SECTIONS, type NoteMode, type NoteSection} from '../../config/uiSurfaces';
import {getNoteCounts} from '../../utils/noteFilters';

export function Header() {
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        notesSection,
        setNotesSection,
        notesMode,
        setNotesMode,
        setIsPaletteOpen,
        setIsCaptureComposerOpen,
    } = useView();
    const {notes} = useNotes();

    const openNotes = () => {
        setActiveView('notes');
        setSelectedNoteId(null);
    };

    const openSearch = () => {
        window.dispatchEvent(new CustomEvent('open-search'));
        setIsPaletteOpen(true);
    };

    const selectSection = (id: NoteSection) => {
        setNotesSection(id);
        if (id === 'trash') setNotesMode('list');
    };

    if (selectedNoteId) return null;

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
            <button
                type="button"
                onClick={() => setIsCaptureComposerOpen(true)}
                aria-label="New note"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--app-accent)] px-2.5 text-[13px] font-medium text-[#ffffff] transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,black)]"
            >
                <PlusIcon className="h-4 w-4"/>
                <span className="hidden md:inline">New note</span>
            </button>
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
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)] px-3 md:px-4">
                <BrandMark onClick={openNotes}/>
                <h1 className="text-[14px] font-semibold text-[var(--app-text)]">Settings</h1>
                {actions}
            </header>
        );
    }

    const counts = getNoteCounts(notes);
    const sections = NOTE_SECTIONS.map(section => ({...section, count: counts[section.id]}));

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)] px-3 md:px-4">
            <BrandMark onClick={openNotes}/>
            <h1 className="hidden text-[13px] font-semibold text-[var(--app-text)] lg:inline">Notes</h1>

            <div
                className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex"
                role="tablist"
                aria-label="Note filters"
            >
                {sections.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={notesSection === tab.id}
                        onClick={() => selectSection(tab.id)}
                        className={cn(
                            'flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors',
                            notesSection === tab.id
                                ? 'bg-[var(--app-raised)] text-[var(--app-text)]'
                                : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                        )}
                    >
                        {tab.label}
                        <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{tab.count}</span>
                    </button>
                ))}
            </div>

            <select
                value={notesSection}
                onChange={(event) => selectSection(event.target.value as NoteSection)}
                aria-label="Note filters"
                className="h-7 min-w-0 rounded-md border border-[var(--app-line)] bg-[var(--app-surface)] px-1.5 text-[11px] text-[var(--app-text-secondary)] focus:border-[var(--app-accent-line)] focus:outline-none md:hidden"
            >
                {sections.map(section => (
                    <option key={section.id} value={section.id}>
                        {section.label} ({section.count})
                    </option>
                ))}
            </select>

            <div className="ml-auto flex shrink-0 items-center gap-1">
                <Segmented
                    options={NOTE_MODES}
                    value={notesMode}
                    onChange={setNotesMode}
                    label="View mode"
                    className="hidden md:flex"
                />
                <select
                    value={notesMode}
                    onChange={(event) => setNotesMode(event.target.value as NoteMode)}
                    aria-label="View mode"
                    className="h-7 min-w-0 rounded-md border border-[var(--app-line)] bg-[var(--app-surface)] px-1.5 text-[11px] text-[var(--app-text-secondary)] focus:border-[var(--app-accent-line)] focus:outline-none md:hidden"
                >
                    {NOTE_MODES.map(mode => (
                        <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                </select>
                {actions}
            </div>
        </header>
    );
}
