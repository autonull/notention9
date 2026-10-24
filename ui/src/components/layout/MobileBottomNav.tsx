import React, {useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useToast} from '../../hooks/useToast';
import {View} from '@notention/core';
import {
    HomeIcon,
    GitBranchIcon,
    UsersIcon,
    PlusIcon,
    MenuIcon,
    XIcon,
    ClockIcon,
    MapIcon,
    LightBulbIcon,
    NetworkIcon,
    ChatIcon,
    SettingsIcon,
    OntologyIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    DownloadIcon,
    PencilIcon,
    SearchIcon,
    HelpIcon,
    NoteIcon,
    EllipsisVerticalIcon,
    ChevronDownIcon,
} from '../common/icons';
import {IconButton} from '../ui/Primitives';
import {cn} from '../../utils/ui';

const NAV_ITEMS = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, shortcut: '⌘1', priority: 1},
    {id: 'notes', label: 'Notes', icon: NoteIcon, shortcut: '⌘2', priority: 2},
    {id: 'map', label: 'Map', icon: MapIcon, shortcut: '⌘3', priority: 3},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, shortcut: '⌘4', priority: 4},
    {id: 'chat', label: 'Chat', icon: ChatIcon, shortcut: '⌘5', priority: 5},
    {id: 'network', label: 'Network', icon: NetworkIcon, shortcut: '⌘6', priority: 6},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, shortcut: '⌘7', priority: 7},
    {id: 'graph', label: 'Graph', icon: GitBranchIcon, shortcut: '⌘8', priority: 8},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, shortcut: '⌘9', priority: 9},
    {id: 'trash', label: 'Trash', icon: TrashIcon, shortcut: '⌘0', priority: 10},
    {id: 'settings', label: 'Settings', icon: SettingsIcon, priority: 11},
] as const;

const ACTION_ITEMS = [
    {label: 'Quick Capture', icon: PencilIcon, shortcut: '⌘N', id: 'quick-capture'},
    {label: 'New Request', icon: DownloadIcon, shortcut: '⌘R', id: 'new-request'},
    {label: 'New Offer', icon: NoteIcon, shortcut: '⌘O', id: 'new-offer'},
    {label: 'From Template', icon: DocumentDuplicateIcon, shortcut: '⌘T', id: 'from-template'},
] as const;

const QUICK_ACTIONS = [
    {id: 'search', label: 'Search', icon: SearchIcon, shortcut: '⌘K'},
    {id: 'shortcuts', label: 'Shortcuts', icon: HelpIcon, shortcut: '?'},
] as const;

interface MobileBottomNavProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function MobileBottomNav({isOpen = false, onToggle}: MobileBottomNavProps) {
    const {activeView, setActiveView, isPaletteOpen, setIsPaletteOpen, setSelectedNoteId, notificationCount, chatNotificationCount} = useView();
    const {addNote} = useNotes();
    const {addToast} = useToast();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };
        if (isActionMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isActionMenuOpen]);

    const handleSelect = useCallback((viewId: string) => {
        setActiveView(viewId as View);
        if (isPaletteOpen) setIsPaletteOpen(false);
    }, [isPaletteOpen, setIsPaletteOpen, setActiveView]);

    const handleQuickCapture = useCallback(() => {
        addNote({title: 'Quick Capture'});
        setActiveView('notes');
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-property-palette'));
        }, 100);
        addToast('Quick capture created', 'success');
        setIsActionMenuOpen(false);
    }, [addNote, addToast, setActiveView, setIsActionMenuOpen]);

    const handleNewFromTemplate = useCallback(() => {
        setActiveView('notes');
        setIsPaletteOpen(true);
        addToast('Command palette opened — search for templates', 'info');
        setIsActionMenuOpen(false);
    }, [addToast, setActiveView, setIsActionMenuOpen, setIsPaletteOpen]);

    const handleNewRequest = useCallback(() => {
        const note = addNote({
            title: 'New Request',
            content: '<p>I am looking for...</p>',
            properties: [
                {key: 'intent', operator: 'is', values: ['request']},
                {key: 'status', operator: 'is', values: ['open']},
            ],
            tags: ['request'],
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
        setIsActionMenuOpen(false);
    }, [addNote, setActiveView, setSelectedNoteId, setIsActionMenuOpen]);

    const handleNewOffer = useCallback(() => {
        const note = addNote({
            title: 'New Offer',
            content: '<p>I can provide...</p>',
            properties: [
                {key: 'intent', operator: 'is', values: ['offer']},
                {key: 'status', operator: 'is', values: ['available']},
            ],
            tags: ['offer'],
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
        setIsActionMenuOpen(false);
    }, [addNote, setActiveView, setSelectedNoteId, setIsActionMenuOpen]);

    const actionItems = useMemo(() => [
        {label: 'Quick Capture', icon: PencilIcon, action: handleQuickCapture, shortcut: '⌘N'},
        {label: 'New Request', icon: DownloadIcon, action: handleNewRequest, shortcut: '⌘R'},
        {label: 'New Offer', icon: NoteIcon, action: handleNewOffer, shortcut: '⌘O'},
        {label: 'From Template', icon: DocumentDuplicateIcon, action: handleNewFromTemplate, shortcut: '⌘T'},
    ], [handleQuickCapture, handleNewRequest, handleNewOffer, handleNewFromTemplate]);

    const getChatBadgeCount = () => chatNotificationCount;

    return (
        <>
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300',
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                )}
            >
                <div className="card glass rounded-t-2xl shadow-2xl overflow-hidden border-t border-gray-700/50">
                    {/* Primary Navigation - Horizontal scrollable */}
                    <div className="flex items-center justify-start gap-0.5 px-2 py-2.5 pb-1 overflow-x-auto scrollbar-hide scroll-snap-x" role="tablist" aria-label="Main navigation">
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
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
                                    aria-keyshortcuts={item.shortcut}
                                    role="tab"
                                >
                                    <div className="relative flex items-center justify-center">
                                        <Icon className={cn('w-6 h-6', isActive ? 'text-indigo-400' : '')} />
                                        {item.id === 'chat' && getChatBadgeCount() > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 min-w-[16px] bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                                                {getChatBadgeCount() > 9 ? '9+' : getChatBadgeCount()}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-medium uppercase tracking-wider truncate max-w-[56px] text-center">
                                        {item.label}
                                    </span>
                                    {item.shortcut && (
                                        <span className="text-[8px] text-gray-500 font-mono px-1.5 py-0.5 bg-gray-800 rounded badge badge-xs">
                                            {item.shortcut}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Bar - FAB + Quick Actions + Command Palette */}
                    <div className="flex items-center justify-between px-3 pb-3 border-t border-gray-700/30">
                        <div className="relative" ref={actionMenuRef}>
                            <IconButton
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                icon={PlusIcon}
                                variant="primary"
                                size="lg"
                                tooltip="Create New (⌘N)"
                                tooltipPosition="top"
                                aria-label="Create New"
                                aria-expanded={isActionMenuOpen}
                                aria-haspopup="menu"
                                className="touch-target"
                            />

                            {isActionMenuOpen && (
                                <div
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 card glass shadow-2xl overflow-hidden animate-scale-in z-50"
                                    role="menu"
                                >
                                    {actionItems.map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={item.action}
                                            role="menuitem"
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-gray-800 transition-colors touch-target"
                                            aria-keyshortcuts={item.shortcut}
                                        >
                                            <item.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <span className="flex-1 text-sm font-medium">{item.label}</span>
                                            <span className="text-[10px] text-gray-500 font-mono px-2 py-0.5 bg-gray-800 rounded badge badge-sm badge-gray">
                                                {item.shortcut}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions - Search & Shortcuts */}
                        <div className="flex items-center gap-1.5">
                            {QUICK_ACTIONS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            if (item.id === 'search') {
                                                const searchInput = document.getElementById('sidebar-search-input');
                                                if (searchInput) {
                                                    searchInput.focus();
                                                    if (activeView !== 'notes') {
                                                        setActiveView('notes');
                                                    }
                                                }
                                            } else if (item.id === 'shortcuts') {
                                                window.dispatchEvent(new CustomEvent('open-shortcuts-help'));
                                            }
                                        }}
                                        className={cn(
                                            'btn btn-ghost btn-md p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-target transition-all duration-200',
                                            'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50'
                                        )}
                                        aria-label={item.label}
                                        aria-keyshortcuts={item.shortcut}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </button>
                                );
                            })}
                        </div>

                        <IconButton
                            onClick={() => setIsPaletteOpen(true)}
                            icon={XIcon}
                            variant="secondary"
                            size="lg"
                            tooltip="Command Palette (⌘K)"
                            tooltipPosition="top"
                            aria-label="Command Palette"
                            aria-keyshortcuts="⌘K"
                            className="touch-target"
                        />
                    </div>
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden modal-backdrop"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}
        </>
    );
}