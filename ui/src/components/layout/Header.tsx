import React from 'react';

import {useView} from '../../hooks/useViewContext';
import type {View} from '@notention/core';
import {NavButton} from './NavButton';
import {IconButton} from '../ui/Button';
import {HelpIcon, SearchIcon, SidebarIcon} from '../ui/icons';
import {ConnectionStatus} from './ConnectionStatus';
import {ExtractionStatusBadge} from './ExtractionStatusBadge';
import {PRIMARY_NAV, SETTINGS_VIEW, navTabFor} from '../../utils/navigation';

interface HeaderProps {
    onToggleSidebar: () => void;
    showSidebarToggle?: boolean;
}

export function Header({onToggleSidebar, showSidebarToggle = true}: HeaderProps) {
    const {
        activeView,
        setActiveView,
        notificationCount,
        isSidebarOpen,
        chatNotificationCount,
        selectedNoteId,
        setSelectedNoteId,
        setIsPaletteOpen,
        setIsHelpOpen,
        setNotesSection,
    } = useView();

    const handleNavClick = (view: View) => {
        if (view === 'notes') {
            if (activeView !== 'notes') {
                setNotesSection('all');
                setSelectedNoteId(null);
            } else if (selectedNoteId) {
                setSelectedNoteId(null);
                return;
            }
        }
        setActiveView(view);
    };

    const getLabel = (view: View) => {
        const item = [...PRIMARY_NAV, SETTINGS_VIEW].find(i => i.id === view);
        return item?.label ?? 'Notes';
    };

    return (
        <header
            className="flex-shrink-0 bg-gray-900/80 backdrop-blur-md h-16 px-4 flex items-center justify-between border-b border-gray-700/50 z-50 relative">
            {/* Left Section */}
            <div className="flex items-center gap-4 min-w-0">
                <h1 className="md:hidden text-sm font-semibold text-gray-200 truncate">
                    {getLabel(activeView)}
                </h1>
                {showSidebarToggle && (
                    <IconButton
                        onClick={onToggleSidebar}
                        tooltip={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                        tooltipPosition="bottom"
                        icon={SidebarIcon}
                        variant="ghost"
                        size="lg"
                        className="hidden md:flex"
                    />
                )}

                <div className="hidden lg:flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]"/>
                    <span className="text-sm font-semibold tracking-tight text-gray-100">Notention</span>
                </div>

                <IconButton
                    onClick={() => setIsPaletteOpen(true)}
                    tooltip="Search & Commands"
                    tooltipPosition="bottom"
                    icon={SearchIcon}
                    variant="ghost"
                    size="lg"
                    className="hidden md:flex"
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
                            isActive={navTabFor(activeView) === item.id}
                            onClick={() => handleNavClick(item.id)}
                            badgeCount={badgeCount}
                            showLabel
                        />
                    );
                })}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                <IconButton
                    onClick={() => setIsPaletteOpen(true)}
                    tooltip="Search & Commands"
                    tooltipPosition="bottom"
                    icon={SearchIcon}
                    variant="ghost"
                    size="lg"
                    className="md:hidden"
                    aria-label="Search and commands"
                />
                <IconButton
                    onClick={() => setIsHelpOpen(true)}
                    tooltip="Help & Shortcuts"
                    tooltipPosition="bottom"
                    icon={HelpIcon}
                    variant="ghost"
                    size="lg"
                    className="md:hidden"
                    aria-label="Help and shortcuts"
                />
                <ConnectionStatus/>
                <ExtractionStatusBadge/>
                <div className="hidden md:block">
                    <NavButton
                        icon={<SETTINGS_VIEW.icon/>}
                        label={SETTINGS_VIEW.label}
                        tooltip={SETTINGS_VIEW.label}
                        isActive={activeView === SETTINGS_VIEW.id}
                        onClick={() => setActiveView(SETTINGS_VIEW.id)}
                    />
                </div>
            </div>
        </header>
    );
}
