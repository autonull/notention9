import React, {useRef, useEffect, useState} from 'react';
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
    MicrophoneIcon,
    QrCodeIcon,
} from '../common/icons';
import {IconButton} from '../ui/Primitives';
import {cn} from '../../utils/ui';
import {SHARED_COMMANDS} from '@notention/core';

const MOBILE_NAV_ITEMS = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, showInMobile: true},
    {id: 'notes', label: 'Notes', icon: HomeIcon, showInMobile: true},
    {id: 'map', label: 'Map', icon: MapIcon, showInMobile: true},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, showInMobile: true},
    {id: 'network', label: 'Network', icon: NetworkIcon, showInMobile: true},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, showInMobile: true},
    {id: 'chat', label: 'Chat', icon: ChatIcon, showInMobile: true},
    {id: 'graph', label: 'Graph', icon: GitBranchIcon, showInMobile: true},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, showInMobile: true},
    {id: 'trash', label: 'Trash', icon: TrashIcon, showInMobile: true},
    {id: 'self', label: 'Self', icon: UsersIcon, showInMobile: true},
    {id: 'settings', label: 'Settings', icon: SettingsIcon, showInMobile: true},
] as const;

interface MobileBottomNavProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function MobileBottomNav({isOpen = false, onToggle}: MobileBottomNavProps) {
    const {activeView, setActiveView, isPaletteOpen, setIsPaletteOpen, searchTerm, setSearchTerm} = useView();
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

    const handleSelect = (viewId: string) => {
        setActiveView(viewId as View);
        if (isPaletteOpen) setIsPaletteOpen(false);
    };

    const handleQuickCapture = () => {
        const newNote = addNote({title: 'Quick Capture'});
        setActiveView('notes');
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-property-palette'));
        }, 100);
        addToast('Quick capture created', 'success');
        setIsActionMenuOpen(false);
    };

    const handleNewFromTemplate = () => {
        setActiveView('notes');
        setIsPaletteOpen(true);
        addToast('Command palette opened - search for templates', 'info');
        setIsActionMenuOpen(false);
    };

    const handleScanQR = () => {
        addToast('QR scanning coming soon', 'info');
        setIsActionMenuOpen(false);
    };

    const handleVoiceNote = () => {
        addToast('Voice input coming soon', 'info');
        setIsActionMenuOpen(false);
    };

    const actionItems = [
        {label: 'Quick Capture', icon: PlusIcon, action: handleQuickCapture, shortcut: 'Ctrl+N'},
        {label: 'New from Template', icon: DocumentDuplicateIcon, action: handleNewFromTemplate, shortcut: 'Ctrl+T'},
        {label: 'Scan QR Code', icon: QrCodeIcon, action: handleScanQR, shortcut: 'Ctrl+Shift+Q'},
        {label: 'Voice Note', icon: MicrophoneIcon, action: handleVoiceNote, shortcut: 'Ctrl+Shift+V'},
    ];

    const visibleNavItems = MOBILE_NAV_ITEMS.filter(item => item.showInMobile);

    return (
        <>
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300',
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                )}
            >
                <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 rounded-t-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-around px-2 py-2">
                        {visibleNavItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                                        isActive
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                    )}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className={cn('w-5 h-5', isActive ? 'text-indigo-400' : '')} />
                                    <span className="text-[10px] font-medium uppercase tracking-wider truncate max-w-[48px]">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between px-3 pb-3 border-t border-gray-700/30">
                        <div className="relative" ref={actionMenuRef}>
                            <IconButton
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                icon={PlusIcon}
                                variant="primary"
                                size="lg"
                                tooltip="Quick Actions"
                                tooltipPosition="top"
                                aria-label="Quick Actions"
                                aria-expanded={isActionMenuOpen}
                                aria-haspopup="menu"
                            />

                            {isActionMenuOpen && (
                                <div
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in z-50"
                                    role="menu"
                                >
                                    {actionItems.map((item, index) => (
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

                        <IconButton
                            onClick={() => setIsPaletteOpen(true)}
                            icon={MenuIcon}
                            variant="secondary"
                            size="lg"
                            tooltip="Command Palette (Ctrl+K)"
                            tooltipPosition="top"
                            aria-label="Command Palette"
                        />
                    </div>
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