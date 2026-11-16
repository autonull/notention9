import React, {useMemo, useState, useRef, useEffect} from 'react';

import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {useNoteActions} from '../../hooks/useNoteActions';
import type {Template, View} from '@notention/core';
import {generateTemplatesFromOntology} from '@notention/core';
import {NavButton} from './NavButton';
import {IconButton} from '../ui/Button';
import {SearchIcon, SidebarIcon, MoreHorizontalIcon, ChevronDownIcon} from '../ui/icons';
import {NewNoteButton} from './NewNoteButton';
import {ConnectionStatus} from './ConnectionStatus';
import {PRIMARY_NAV, SECONDARY_NAV, SETTINGS_VIEW} from '../../utils/navigation';
import {modShortcut} from '../../utils/platform';

interface HeaderProps {
    onNewNote: () => void;
    onToggleSidebar: () => void;
}

function MoreMenu({
    activeView,
    setActiveView,
    notificationCount,
    chatNotificationCount
}: {
    activeView: View;
    setActiveView: (view: View) => void;
    notificationCount: number;
    chatNotificationCount: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                    className="absolute right-0 top-full mt-1.5 min-w-[180px] bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl py-1.5 z-50"
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
                                className={`w-full px-3 py-2 flex items-center gap-3 text-left rounded-lg transition-colors ${
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
                                    <span className="ml-auto min-w-[18px] h-[18px] px-1.5 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <hr className="my-1.5 border-gray-700/50"/>
                    <button
                        onClick={() => handleNavClick(SETTINGS_VIEW.id)}
                        className="w-full px-3 py-2 flex items-center gap-3 text-left rounded-lg transition-colors text-gray-300 hover:bg-gray-800/50 hover:text-white"
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

export function Header({onNewNote, onToggleSidebar}: HeaderProps) {
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
    const {settings} = useSettings();
    const {createNoteAndNavigate} = useNoteActions();

    const handleNavClick = (view: View) => {
        if (view === 'notes' && activeView === 'notes' && selectedNoteId) {
            setSelectedNoteId(null);
        } else {
            setActiveView(view);
        }
    };

    const handleCreateIntent = (type: 'request' | 'offer') => {
        const isRequest = type === 'request';
        createNoteAndNavigate(
            isRequest ? 'New Request' : 'New Offer',
            `<p>${isRequest ? 'I am looking for...' : 'I can provide...'}</p>`,
            [
                {key: 'intent', operator: 'is', values: [type]},
                {key: 'status', operator: 'is', values: [isRequest ? 'open' : 'available']},
            ],
            {tags: [type]}
        );
    };

    const handleCreateFromTemplate = (template: Template) => {
        createNoteAndNavigate(undefined, template.content);
    };

    const generatedTemplates = useMemo(() => {
        return generateTemplatesFromOntology(settings.ontology ?? []);
    }, [settings.ontology]);

    // Combine generated templates with custom ones
    const allTemplates = [...generatedTemplates, ...(settings.customTemplates ?? [])];

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

                <NewNoteButton
                    onNewNote={onNewNote}
                    onCreateIntent={handleCreateIntent}
                    templates={allTemplates}
                    onCreateFromTemplate={handleCreateFromTemplate}
                    label={modShortcut('N')}
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
