import React, {useCallback} from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import type {View} from '@notention/core';
import {HelpIcon, PlusIcon, SearchIcon} from '../common/icons';
import {IconButton} from '../ui/Primitives';
import {cn} from '../../utils/ui';
import {NAV_ITEMS, SETTINGS_VIEW} from '../../utils/navigation';

const NAVIGATION = [...NAV_ITEMS, SETTINGS_VIEW];

interface MobileBottomNavProps {
    isOpen?: boolean;
}

export function MobileBottomNav({isOpen = false}: MobileBottomNavProps) {
    const {activeView, setActiveView, setIsPaletteOpen, setSelectedNoteId, notificationCount, chatNotificationCount} = useView();
    const {addNote} = useNotes();

    const handleSelect = useCallback((view: View) => {
        if (view === 'notes') {
            setSelectedNoteId(null);
        }
        setActiveView(view);
        setIsPaletteOpen(false);
    }, [setActiveView, setIsPaletteOpen, setSelectedNoteId]);

    const handleCreateNote = useCallback(() => {
        const note = addNote();
        setSelectedNoteId(note.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    return (
        <div
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300',
                isOpen ? 'translate-y-full' : 'translate-y-0'
            )}
        >
            <div className="card glass rounded-t-2xl shadow-2xl overflow-hidden border-t border-gray-700/50">
                <div
                    className="flex items-center gap-0.5 px-2 py-2.5 pb-1 overflow-x-auto scrollbar-hide scroll-snap-x"
                    role="tablist"
                    aria-label="Main navigation"
                >
                    {NAVIGATION.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        const badgeCount = item.badgeCountKey === 'notificationCount'
                            ? notificationCount
                            : item.badgeCountKey === 'chatNotificationCount'
                                ? chatNotificationCount
                                : 0;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.id)}
                                className={cn(
                                    'btn btn-ghost btn-xs flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl min-w-[60px] flex-shrink-0 touch-target transition-all duration-200 snap-start',
                                    isActive
                                        ? 'bg-indigo-600/20 text-indigo-400'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50'
                                )}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                aria-keyshortcuts={item.shortcut ? `Alt+${item.shortcut}` : undefined}
                                role="tab"
                            >
                                <div className="relative flex items-center justify-center">
                                    <Icon className={cn('w-6 h-6', isActive ? 'text-indigo-400' : '')}/>
                                    {badgeCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                                            {badgeCount > 9 ? '9+' : badgeCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-wider truncate max-w-[56px] text-center">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between px-3 pb-3 border-t border-gray-700/30">
                    <IconButton
                        onClick={handleCreateNote}
                        icon={PlusIcon}
                        variant="primary"
                        size="lg"
                        tooltip="New Note"
                        tooltipPosition="top"
                        aria-label="New Note"
                        className="touch-target"
                    />

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setIsPaletteOpen(true)}
                            className="btn btn-ghost btn-md p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-target transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50"
                            aria-label="Search and commands"
                            aria-keyshortcuts="Meta+K"
                        >
                            <SearchIcon className="w-6 h-6"/>
                        </button>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-shortcuts-help'))}
                            className="btn btn-ghost btn-md p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-target transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50"
                            aria-label="Keyboard shortcuts"
                        >
                            <HelpIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
