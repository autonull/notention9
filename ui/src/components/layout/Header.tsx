import React from 'react';
import {useView} from '../../hooks/useViewContext';
import {IconButton} from '../ui/Button';
import {PlusIcon, SearchIcon, SettingsIcon} from '../ui/icons';
import {modShortcut} from '../../utils/platform';

export function Header() {
    const {
        activeView,
        setActiveView,
        setSelectedNoteId,
        setIsPaletteOpen,
        setIsCaptureComposerOpen,
    } = useView();

    const openNotes = () => {
        setActiveView('notes');
        setSelectedNoteId(null);
    };

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-4 md:px-6">
            <button
                type="button"
                onClick={openNotes}
                className="flex items-center gap-2 rounded-lg px-1 py-2 text-neutral-100"
                aria-label="Notention notes"
            >
                <span aria-hidden="true" className="text-xl leading-none text-neutral-300">✳</span>
                <span className="text-base font-semibold tracking-tight">Notention</span>
            </button>

            <button
                type="button"
                onClick={() => setIsPaletteOpen(true)}
                className="flex h-10 min-w-0 flex-1 max-w-xl items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-left text-sm text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                aria-label="Search notes, details, tags, and commands"
            >
                <SearchIcon className="h-4 w-4 shrink-0"/>
                <span className="truncate">Search notes, details, tags…</span>
                <kbd className="ml-auto hidden rounded border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-xs text-neutral-400 md:inline">
                    {modShortcut('K')}
                </kbd>
            </button>

            <div className="flex items-center gap-1">
                <IconButton
                    onClick={() => setIsCaptureComposerOpen(true)}
                    tooltip={`New note (${modShortcut('N')})`}
                    tooltipPosition="bottom"
                    icon={PlusIcon}
                    variant="primary"
                    size="lg"
                    aria-label="New note"
                />
                <IconButton
                    onClick={() => setActiveView('settings')}
                    tooltip="Settings"
                    tooltipPosition="bottom"
                    icon={SettingsIcon}
                    variant="ghost"
                    size="lg"
                    isActive={activeView === 'settings'}
                    aria-label="Settings"
                />
            </div>
        </header>
    );
}
