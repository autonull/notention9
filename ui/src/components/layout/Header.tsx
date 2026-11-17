import React, {useMemo, useState, useRef, useEffect} from 'react';

import {useView} from '../../hooks/useViewContext';
import {useDirection} from '../../hooks/useI18n';
import type {View} from '@notention/core';
import {NavButton} from './NavButton';
import {IconButton} from '../ui/Button';
import {SearchIcon, SidebarIcon, MoreHorizontalIcon, ChevronDownIcon} from '../ui/icons';
import {ConnectionStatus} from './ConnectionStatus';
import {PRIMARY_NAV, SECONDARY_NAV, SETTINGS_VIEW} from '../../utils/navigation';
import {modShortcut} from '../../utils/platform';

interface HeaderProps {
    onToggleSidebar: () => void;
}

function MoreMenu({
    activeView,
    setActiveView,
    notificationCount,
    chatNotificationCount,
    direction
}: {
    activeView: View;
    setActiveView: (view: View) => void;
    notificationCount: number;
    chatNotificationCount: number;
    direction: 'ltr' | 'rtl';
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isRTL = direction === 'rtl';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavClick = (view: View) => {
        setActiveView(view);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <IconButton
                onClick={() => setIsOpen(!isOpen)}
                icon={MoreHorizontalIcon}
                tooltip="More (Alt+M)"
                tooltipPosition="bottom"
                variant="ghost"
                size="lg"
                aria-expanded={isOpen}
                aria-haspopup="true"
                label={modShortcut('M')}
            />
            {isOpen && (
                <div
                    className={`absolute top-full mt-1.5 min-w-[180px] bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl py-1.5 z-50 ${
                        isRTL ? 'left-0 right-auto' : 'right-0 left-auto'
                    }`}
                    role="menu"
                >
                    {SECONDARY_NAV.map((item) => {
                        const badgeCount = item.badgeCountKey
                            ? (item.badgeCountKey === 'notificationCount' ? notificationCount : chatNotificationCount)
                            : undefined;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`w-full px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${isRTL ? 'text-right' : 'text-left'} ${
                                    activeView === item.id
                                        ? 'bg-indigo-600/20 text-indigo-400'
                                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                                }`}
                                role="menuitem"
                                aria-current={activeView === item.id ? 'page' : undefined}
                                aria-keyshortcuts={item.shortcut ? `Alt+${item.shortcut}` : undefined}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true"/>
                                <span className="text-sm font-medium truncate">{item.label}</span>
                                {badgeCount !== undefined && badgeCount > 0 && (
                                    <span className={`min-w-[18px] h-[18px] px-1.5 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <hr className="my-1.5 border-gray-700/50"/>
                    <button
                        onClick={() => handleNavClick(SETTINGS_VIEW.id)}
                        className={`w-full px-3 py-2 flex items-center gap-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-800/50 hover:text-white ${isRTL ? 'text-right' : 'text-left'}`}
                        role="menuitem"
                        aria-current={activeView === SETTINGS_VIEW.id ? 'page' : undefined}
                        aria-keyshortcuts={SETTINGS_VIEW.shortcut ? `${modShortcut(SETTINGS_VIEW.shortcut)}` : undefined}
                    >
                        <SETTINGS_VIEW.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true"/>
                        <span className="text-sm font-medium truncate">{SETTINGS_VIEW.label}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export function Header({onToggleSidebar}: HeaderProps) {
    const {
        activeView,
        setActiveView,
        notificationCount,
        isSidebarOpen,
        chatNotificationCount,
        selectedNoteId,
        setSelectedNoteId,
        setIsPaletteOpen
    } = useView();
    const direction = useDirection();
    const isRTL = direction === 'rtl';

    const handleNavClick = (view: View) => {
        if (view === 'notes' && activeView === 'notes' && selectedNoteId) {
            setSelectedNoteId(null);
        } else {
            setActiveView(view);
        }
    };

    return (
        <header
            className="flex-shrink-0 bg-gray-900/80 backdrop-blur-md h-16 px-4 flex items-center justify-between border-b border-gray-700/50 z-50 relative">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <IconButton
                    onClick={onToggleSidebar}
                    tooltip={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                    tooltipPosition="bottom"
                    icon={SidebarIcon}
                    variant="ghost"
                    size="lg"
                    className="hidden md:flex"
                    label={modShortcut('\\')}
                />

                <IconButton
                    onClick={() => setIsPaletteOpen(true)}
                    tooltip={`Search & Commands (${modShortcut('K')})`}
                    tooltipPosition="bottom"
                    icon={SearchIcon}
                    variant="ghost"
                    size="lg"
                    className="hidden md:flex"
                    label={modShortcut('K')}
                />
            </div>

            {/* Center Section - Primary Navigation (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-1">
                {PRIMARY_NAV.map((item) => {
                    const badgeCount = item.badgeCountKey
                        ? (item.badgeCountKey === 'notificationCount' ? notificationCount : chatNotificationCount)
                        : undefined;
                    return (
                        <NavButton
                            key={item.id}
                            icon={<item.icon/>}
                            label={item.label}
                            tooltip={item.shortcut ? `${item.label} (Alt+${item.shortcut})` : item.label}
                            isActive={activeView === item.id}
                            onClick={() => handleNavClick(item.id)}
                            badgeCount={badgeCount}
                        />
                    );
                })}
                <MoreMenu
                    activeView={activeView}
                    setActiveView={setActiveView}
                    notificationCount={notificationCount}
                    chatNotificationCount={chatNotificationCount}
                    direction={direction}
                />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                <ConnectionStatus/>
                <NavButton
                    icon={<SETTINGS_VIEW.icon/>}
                    label={SETTINGS_VIEW.label}
                    tooltip={SETTINGS_VIEW.label}
                    isActive={activeView === SETTINGS_VIEW.id}
                    onClick={() => setActiveView(SETTINGS_VIEW.id)}
                />
            </div>
        </header>
    );
}
