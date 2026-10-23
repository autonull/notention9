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
} from '../common/icons';
import {IconButton} from '../ui/Primitives';
import {cn} from '../../utils/ui';

const MOBILE_NAV_ITEMS = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, showInMobile: true, priority: 1},
    {id: 'notes', label: 'Notes', icon: NoteIcon, showInMobile: true, priority: 2},
    {id: 'map', label: 'Map', icon: MapIcon, showInMobile: true, priority: 3},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, showInMobile: true, priority: 4},
    {id: 'network', label: 'Network', icon: NetworkIcon, showInMobile: true, priority: 5},
    {id: 'chat', label: 'Chat', icon: ChatIcon, showInMobile: true, priority: 6},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, showInMobile: false, priority: 7},
    {id: 'graph', label: 'Graph', icon: GitBranchIcon, showInMobile: false, priority: 8},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, showInMobile: false, priority: 9},
    {id: 'trash', label: 'Trash', icon: TrashIcon, showInMobile: false, priority: 10},
    {id: 'self', label: 'Self', icon: UsersIcon, showInMobile: false, priority: 11},
    {id: 'settings', label: 'Settings', icon: SettingsIcon, showInMobile: false, priority: 12},
] as const;

const MOBILE_ACTION_ITEMS = [
    {id: 'search', label: 'Search', icon: SearchIcon, priority: 1, shortcut: '⌘F'},
    {id: 'shortcuts', label: 'Shortcuts', icon: HelpIcon, priority: 2, shortcut: '?'},
] as const;

interface MobileBottomNavProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function MobileBottomNav({isOpen = false, onToggle}: MobileBottomNavProps) {
    const {activeView, setActiveView, isPaletteOpen, setIsPaletteOpen} = useView();
    const {addNote} = useNotes();
    const {addToast} = useToast();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const [showMore, setShowMore] = useState(false);

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

    const {setSelectedNoteId} = useView();

    const actionItems = useMemo(() => [
        {label: 'Quick Capture', icon: PencilIcon, action: handleQuickCapture, shortcut: '⌘N'},
        {label: 'New Request', icon: DownloadIcon, action: handleNewRequest, shortcut: '⌘R'},
        {label: 'New Offer', icon: NoteIcon, action: handleNewOffer, shortcut: '⌘O'},
        {label: 'From Template', icon: DocumentDuplicateIcon, action: handleNewFromTemplate, shortcut: '⌘T'},
    ], [addNote, setActiveView, setSelectedNoteId, setIsPaletteOpen]);

    const primaryNavItems = MOBILE_NAV_ITEMS.filter(item => item.showInMobile && item.priority <= 5);
    const secondaryNavItems = MOBILE_NAV_ITEMS.filter(item => item.showInMobile && item.priority > 5);
    const hiddenNavItems = MOBILE_NAV_ITEMS.filter(item => !item.showInMobile);

    return (
        <>
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300',
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                )}
            >
                <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 rounded-t-2xl shadow-2xl overflow-hidden">
                    {/* Primary Navigation - Always Visible */}
                    <div className="flex items-center justify-around px-2 py-2.5">
                        {primaryNavItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        'flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 min-w-[60px]',
                                        isActive
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 active:bg-gray-700/50'
                                    )}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className={cn('w-6 h-6', isActive ? 'text-indigo-400' : '')} />
                                    <span className="text-[10px] font-medium uppercase tracking-wider truncate max-w-[56px] text-center">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Bar - FAB + Quick Actions + More + Command Palette */}
                    <div className="flex items-center justify-between px-3 pb-3 border-t border-gray-700/30">
                        <div className="relative" ref={actionMenuRef}>
                            <IconButton
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                icon={PlusIcon}
                                variant="primary"
                                size="lg"
                                tooltip="Create New"
                                tooltipPosition="top"
                                aria-label="Create New"
                                aria-expanded={isActionMenuOpen}
                                aria-haspopup="menu"
                            />

                            {isActionMenuOpen && (
                                <div
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50"
                                    role="menu"
                                >
                                    {actionItems.map((item, _index) => (
                                        <button
                                            key={item.label}
                                            onClick={item.action}
                                            role="menuitem"
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-gray-800 transition-colors"
                                        >
                                            <item.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            <span className="flex-1 text-sm font-medium">{item.label}</span>
                                            <span className="text-[10px] text-gray-500 font-mono px-2 py-0.5 bg-gray-800 rounded">
                                                {item.shortcut}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions - Search & Shortcuts */}
                        <div className="flex items-center gap-1.5">
                            {MOBILE_ACTION_ITEMS.map((item) => {
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
                                            'p-2.5 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center',
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

                        {/* More Navigation Toggle */}
                        {(secondaryNavItems.length > 0 || hiddenNavItems.length > 0) && (
                            <IconButton
                                onClick={() => setShowMore(!showMore)}
                                icon={MenuIcon}
                                variant="secondary"
                                size="lg"
                                tooltip={showMore ? 'Show Less' : 'More Views'}
                                tooltipPosition="top"
                                aria-label={showMore ? 'Show Less Views' : 'More Views'}
                                aria-expanded={showMore}
                            />
                        )}

                        <IconButton
                            onClick={() => setIsPaletteOpen(true)}
                            icon={XIcon}
                            variant="secondary"
                            size="lg"
                            tooltip="Command Palette (Ctrl+K)"
                            tooltipPosition="top"
                            aria-label="Command Palette"
                        />
                    </div>

                    {/* Expandable Secondary Navigation */}
                    {showMore && (secondaryNavItems.length > 0 || hiddenNavItems.length > 0) && (
                        <div className="px-3 pb-3 animate-slide-in-up">
                            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist">
                                {[...secondaryNavItems, ...hiddenNavItems].map(item => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                handleSelect(item.id);
                                                setShowMore(false);
                                            }}
                                            className={cn(
                                                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] flex-shrink-0',
                                                isActive
                                                    ? 'bg-indigo-600/20 text-indigo-400'
                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                            )}
                                            role="tab"
                                            aria-label={item.label}
                                            aria-selected={isActive}
                                        >
                                            <Icon className={cn('w-5 h-5', isActive ? 'text-indigo-400' : '')} />
                                            <span className="text-[9px] font-medium uppercase tracking-wider truncate max-w-[48px] text-center">
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden bg-black/50"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}
        </>
    );
}