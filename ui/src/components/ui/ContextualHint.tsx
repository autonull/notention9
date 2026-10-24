import React, {useEffect, useMemo, useState} from 'react';
import {useView} from '../../hooks/useViewContext';
import {HelpIcon} from '../common/icons';
import {cn} from '../../utils/ui';

interface ContextualShortcut {
    keys: string[];
    label: string;
    description?: string;
}

interface ContextualHintProps {
    compact?: boolean;
    persistent?: boolean;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const VIEW_SHORTCUTS: Record<string, ContextualShortcut[]> = {
    dashboard: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
        {keys: ['⌘', '/'], label: 'Search Notes', description: 'Focus sidebar search'},
        {keys: ['⌘', '\\'], label: 'Toggle Sidebar', description: 'Show/hide sidebar'},
    ],
    notes: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'S'], label: 'Save Note', description: 'Save current note'},
        {keys: ['⌘', 'P'], label: 'Add Detail', description: 'Add structured property'},
        {keys: ['⌘', '↑'], label: 'Previous Note', description: 'Navigate to previous note'},
        {keys: ['⌘', '↓'], label: 'Next Note', description: 'Navigate to next note'},
        {keys: ['Esc'], label: 'Back to List', description: 'Return to notes list'},
        {keys: ['⌘', 'I'], label: 'Toggle Inspector', description: 'Show/hide property panel'},
        {keys: ['⌘', 'B'], label: 'Toggle Toolbar', description: 'Show/hide editor toolbar'},
    ],
    trash: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    map: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    timeline: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    network: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    chat: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    settings: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
        {keys: ['⌘', '\\'], label: 'Toggle Sidebar', description: 'Show/hide sidebar'},
    ],
    ontology: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    actions: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
    graph: [
        {keys: ['⌘', 'N'], label: 'New Note', description: 'Create a new note'},
        {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Search commands & notes'},
    ],
};

const GLOBAL_SHORTCUTS: ContextualShortcut[] = [
    {keys: ['⌘', 'K'], label: 'Command Palette', description: 'Open anywhere'},
    {keys: ['⌘', '/'], label: 'Search Notes', description: 'Focus sidebar search'},
    {keys: ['⌘', '\\'], label: 'Toggle Sidebar', description: 'Show/hide sidebar'},
    {keys: ['?'], label: 'Show All Shortcuts', description: 'Open keyboard help'},
];

export function ContextualHint({compact = false, persistent = false, position = 'bottom-right'}: ContextualHintProps) {
    const {activeView} = useView();
    const [isVisible, setIsVisible] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const shortcuts = useMemo(() => {
        const viewShortcuts = VIEW_SHORTCUTS[activeView] || [];
        if (showAll) {
            return [...viewShortcuts, {keys: [], label: '— Global —', description: ''}, ...GLOBAL_SHORTCUTS];
        }
        return viewShortcuts.slice(0, compact ? 3 : 5);
    }, [activeView, showAll, compact]);

    const formatKeys = (keys: string[]) => {
        if (!keys.length) return '';
        return keys.map(k => {
            if (k === '⌘') return '⌘';
            if (k === 'Ctrl') return 'Ctrl';
            if (k === 'Alt') return '⌥';
            if (k === 'Shift') return '⇧';
            return k;
        }).join(' + ');
    };

    useEffect(() => {
        if (persistent) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [activeView, persistent]);

    if (!isVisible || shortcuts.length === 0) return null;

    const positionStyles = {
        'bottom-right': 'bottom-24 right-4',
        'bottom-left': 'bottom-24 left-4',
        'top-right': 'top-24 right-4',
        'top-left': 'top-24 left-4',
    };

    return (
        <div
            className={cn(
                'fixed z-40 animate-slide-in-up pointer-events-none',
                positionStyles[position],
                compact && 'md:hidden'
            )}
            role="status"
            aria-live="polite"
        >
            <div className="pointer-events-auto card glass rounded-xl shadow-xl border border-gray-700/50 overflow-hidden min-w-[280px] max-w-[360px]">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/50 border-b border-gray-700/50">
                    <HelpIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-200">
                        {showAll ? 'All Shortcuts' : `Shortcuts for ${activeView}`}
                    </span>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="ml-auto text-xs text-gray-500 hover:text-gray-200 flex items-center gap-1"
                        aria-label={showAll ? 'Show fewer shortcuts' : 'Show all shortcuts'}
                    >
                        {showAll ? 'Show less' : 'Show all'}
                        <HelpIcon className="w-3 h-3" />
                    </button>
                </div>
                <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={`${shortcut.label}-${index}`}
                            className={cn(
                                'flex items-center gap-3 px-2 py-2 rounded-lg transition-colors',
                                shortcut.keys.length === 0 ? 'text-gray-500 text-xs font-medium uppercase tracking-wider' : 'hover:bg-gray-800/50'
                            )}
                        >
                            {shortcut.keys.length > 0 && (
                                <kbd className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded bg-gray-700 text-gray-300 border border-gray-600/50 min-w-[60px] text-center">
                                    {formatKeys(shortcut.keys)}
                                </kbd>
                            )}
                            <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-200 truncate block">{shortcut.label}</span>
                                {shortcut.description && (
                                    <span className="text-xs text-gray-500 truncate block">{shortcut.description}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700/50">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-shortcuts-help'))}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                        View all keyboard shortcuts (?)
                    </button>
                </div>
            </div>
        </div>
    );
}