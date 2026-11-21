import React, {useCallback} from 'react';
import {useView} from '../../hooks/useViewContext';
import type {View} from '@notention/core';
import {SearchIcon, HelpIcon} from '../ui/icons';
import {cn} from '../../utils/ui';
import {MOBILE_NAV, SETTINGS_VIEW} from '../../utils/navigation';

interface MobileBottomNavProps {
    isOpen?: boolean;
}

export function MobileBottomNav({isOpen = false}: MobileBottomNavProps) {
    const {activeView, setActiveView, setIsPaletteOpen, setSelectedNoteId, notificationCount, chatNotificationCount} = useView();

    const handleSelect = useCallback((view: View) => {
        if (view === 'notes') {
            setSelectedNoteId(null);
        }
        setActiveView(view);
        setIsPaletteOpen(false);
    }, [setActiveView, setIsPaletteOpen, setSelectedNoteId]);

    const getBadgeCount = (item: {badgeCountKey?: 'notificationCount' | 'chatNotificationCount'}) => {
        if (item.badgeCountKey === 'notificationCount') return notificationCount;
        if (item.badgeCountKey === 'chatNotificationCount') return chatNotificationCount;
        return 0;
    };

    return (
        <div
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300',
                isOpen ? 'translate-y-full' : 'translate-y-0'
            )}
        >
            <div className="card glass rounded-t-2xl shadow-2xl overflow-hidden border-t border-gray-700/50">
                <div className="flex items-center gap-1 px-2 py-1.5">
                    <div className="flex flex-1 items-center gap-0.5" role="tablist" aria-label="Main navigation">
                        {MOBILE_NAV.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            const badgeCount = getBadgeCount(item as {badgeCountKey?: 'notificationCount' | 'chatNotificationCount'});

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        'btn btn-ghost btn-xs flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 touch-target transition-all duration-200',
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
                                    <span className="text-[9px] font-medium uppercase tracking-normal truncate max-w-full text-center">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center flex-shrink-0 border-l border-gray-700/30 pl-1">
                        <button
                            onClick={() => setIsPaletteOpen(true)}
                            className="btn btn-ghost btn-md p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-target transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50"
                            aria-label="Search and commands"
                            aria-keyshortcuts="Meta+K"
                        >
                            <SearchIcon className="w-5 h-5"/>
                        </button>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-shortcuts-help'))}
                            className="btn btn-ghost btn-md p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-target transition-all duration-200 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50"
                            aria-label="Keyboard shortcuts"
                        >
                            <HelpIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
