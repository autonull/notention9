import React from 'react';

import {useView} from '../../hooks/useViewContext';
import {useDirection} from '../../hooks/useI18n';
import type {View} from '@notention/core';
import {NavButton} from './NavButton';
import {IconButton} from '../ui/Button';
import {SearchIcon, SidebarIcon} from '../ui/icons';
import {ConnectionStatus} from './ConnectionStatus';
import {ExtractionStatusBadge} from './ExtractionStatusBadge';
import {PRIMARY_NAV, SETTINGS_VIEW} from '../../utils/navigation';
import {modShortcut} from '../../utils/platform';

interface HeaderProps {
    onToggleSidebar: () => void;
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
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                <ConnectionStatus/>
                <ExtractionStatusBadge/>
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
