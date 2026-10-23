import React, {useEffect, useMemo} from 'react';
import {IconButton} from '../ui/Primitives';
import {XIcon, HelpIcon} from '../common/icons';
import {cn} from '../../utils/ui';

export interface ShortcutGroup {
    category: string;
    shortcuts: ShortcutItem[];
}

export interface ShortcutItem {
    label: string;
    keys: string[];
    description?: string;
    action?: () => void;
    global?: boolean;
}

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
    groups?: ShortcutGroup[];
}

const DEFAULT_GROUPS: ShortcutGroup[] = [
    {
        category: 'Navigation',
        shortcuts: [
            {label: 'Dashboard', keys: ['G', 'D'], description: 'Go to dashboard'},
            {label: 'Notes', keys: ['G', 'N'], description: 'Go to notes list'},
            {label: 'Map', keys: ['G', 'M'], description: 'Open map view'},
            {label: 'Timeline', keys: ['G', 'T'], description: 'Open timeline view'},
            {label: 'Network', keys: ['G', 'W'], description: 'Open network view'},
            {label: 'Chat', keys: ['G', 'C'], description: 'Open chat view'},
            {label: 'Settings', keys: ['G', 'S'], description: 'Open settings'},
            {label: 'Trash', keys: ['G', 'X'], description: 'Open trash'},
        ],
    },
    {
        category: 'Editor',
        shortcuts: [
            {label: 'New Note', keys: ['⌘', 'N'], description: 'Create a new note', global: true},
            {label: 'Save Note', keys: ['⌘', 'S'], description: 'Save current note', global: true},
            {label: 'Previous Note', keys: ['⌘', '↑'], description: 'Navigate to previous note'},
            {label: 'Next Note', keys: ['⌘', '↓'], description: 'Navigate to next note'},
            {label: 'Back to List', keys: ['Esc'], description: 'Return to notes list'},
            {label: 'Toggle Inspector', keys: ['⌘', 'I'], description: 'Show/hide property panel'},
            {label: 'Toggle Toolbar', keys: ['⌘', 'B'], description: 'Show/hide editor toolbar'},
            {label: 'Open Property Palette', keys: ['⌘', 'P'], description: 'Add structured property'},
        ],
    },
    {
        category: 'Search & Commands',
        shortcuts: [
            {label: 'Command Palette', keys: ['⌘', 'K'], description: 'Open command palette', global: true},
            {label: 'Search Notes', keys: ['⌘', 'F'], description: 'Focus search in sidebar', global: true},
            {label: 'Toggle Sidebar', keys: ['⌘', '\\'], description: 'Show/hide sidebar', global: true},
        ],
    },
    {
        category: 'Quick Capture',
        shortcuts: [
            {label: 'New Request', keys: ['⌘', 'R'], description: 'Create a new request note'},
            {label: 'New Offer', keys: ['⌘', 'O'], description: 'Create a new offer note'},
            {label: 'From Template', keys: ['⌘', 'T'], description: 'Create from template'},
        ],
    },
    {
        category: 'Help & Meta',
        shortcuts: [
            {label: 'Show This Help', keys: ['?'], description: 'Open keyboard shortcuts help', global: true},
            {label: 'Close Dialog', keys: ['Esc'], description: 'Close any open modal or dialog', global: true},
        ],
    },
];

export function KeyboardShortcutsHelp({
    isOpen,
    onClose,
    groups = DEFAULT_GROUPS,
}: KeyboardShortcutsHelpProps) {
    const platform = useMemo(() => {
        if (typeof navigator !== 'undefined') {
            return navigator.platform.includes('Mac') ? 'mac' : 'win';
        }
        return 'win';
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const formatKeys = (keys: string[]) => {
        if (platform === 'mac') {
            return keys.map(k => {
                if (k === '⌘') return '⌘';
                if (k === 'Ctrl') return 'Ctrl';
                if (k === 'Alt') return '⌥';
                if (k === 'Shift') return '⇧';
                return k;
            }).join(' + ');
        }
        return keys.map(k => {
            if (k === '⌘') return 'Ctrl';
            if (k === 'Ctrl') return 'Ctrl';
            if (k === 'Alt') return 'Alt';
            if (k === 'Shift') return 'Shift';
            return k;
        }).join(' + ');
    };

    return (
        <div
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
        >
            <div
                className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                            <HelpIcon className="w-6 h-6" />
                        </div>
                        <h2 id="keyboard-shortcuts-title" className="text-xl font-semibold text-white">
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <IconButton
                        onClick={onClose}
                        icon={XIcon}
                        variant="ghost"
                        size="md"
                        aria-label="Close shortcuts help"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {groups.map((group) => (
                        <div key={group.category} className="mb-8">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">
                                {group.category}
                            </h3>
                            <div className="space-y-2">
                                {group.shortcuts.map((shortcut, index) => (
                                    <div
                                        key={`${group.category}-${index}`}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors group"
                                        onClick={shortcut.action}
                                        role={shortcut.action ? 'button' : undefined}
                                        tabIndex={shortcut.action ? 0 : undefined}
                                        onKeyDown={(e) => {
                                            if (shortcut.action && (e.key === 'Enter' || e.key === ' ')) {
                                                e.preventDefault();
                                                shortcut.action();
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="text-sm text-gray-300 truncate pr-4">
                                                {shortcut.label}
                                            </span>
                                            {shortcut.description && (
                                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                                    {shortcut.description}
                                                </span>
                                            )}
                                        </div>
                                        <kbd className={cn(
                                            'flex-shrink-0 ml-4 text-[10px] font-mono px-2 py-1 rounded',
                                            'bg-gray-700 text-gray-400',
                                            'group-hover:bg-gray-600 group-hover:text-gray-200',
                                            'transition-colors',
                                            shortcut.global && 'ring-1 ring-blue-500/30'
                                        )}>
                                            {formatKeys(shortcut.keys)}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">
                                {platform === 'mac' ? '⌘' : 'Ctrl'}
                            </span>
                            <span> = Command (Mac) / Control (Windows/Linux)</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Global shortcuts (marked with ring) work anywhere in the app.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}