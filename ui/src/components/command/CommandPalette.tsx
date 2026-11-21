import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actionRegistry } from '@notention/core/ui';
import type { ActionContext, RegisteredAction } from '@notention/core/ui/actionRegistry';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { KeyIcon, SearchIcon, SearchSparkleIcon, MenuIcon, ChevronRightIcon, type LucideIcon } from '../ui/icons';
import { useView } from '../../hooks/useViewContext';
import { useNotes } from '../../hooks/useNotes';
import { getTextFromHtml } from '@notention/core';
import { sanitizeHTML } from '../../utils/sanitize';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onAction?: (actionId: string) => void;
}

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'Navigation', label: 'Navigation', icon: ChevronRightIcon },
    { id: 'Capture', label: 'Capture', icon: KeyIcon },
    { id: 'Note', label: 'Note', icon: MenuIcon },
    { id: 'Search', label: 'Search', icon: SearchSparkleIcon },
    { id: 'Match', label: 'Match', icon: MenuIcon },
    { id: 'Help', label: 'Help', icon: KeyIcon },
    { id: 'Other', label: 'Other', icon: MenuIcon },
];

function getCategoryInfo(category?: string) {
    return CATEGORIES.find(c => c.id === category) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatShortcut(shortcut?: { key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }) {
    if (!shortcut) return '';
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.meta) parts.push('⌘');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
    return parts.join('+');
}

function fuzzyMatch(query: string, text: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
}

function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query) return text;
    const q = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let qi = 0;
    for (let i = 0; i < text.length && qi < q.length; i++) {
        if (text[i].toLowerCase() === q[qi]) {
            if (i > lastIndex) {
                parts.push(text.slice(lastIndex, i));
            }
            parts.push(<mark key={i} className="bg-yellow-500/30 text-yellow-300">{text[i]}</mark>);
            lastIndex = i + 1;
            qi++;
        }
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
}

interface ScoredAction {
    action: RegisteredAction;
    score: number;
    matchedText: string;
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
    const { setActiveView } = useView();
    const { notes } = useNotes();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [results, setResults] = useState<ScoredAction[]>([]);

    // Build context for action enabling
    const context = useMemo<ActionContext>(() => ({
        view: 'inbox', // TODO: get actual view
    }), []);

    // Get actions and notes for search
    const paletteActions = useMemo(() => actionRegistry.getPaletteActions(context), [context]);
    const noteActions = useMemo((): RegisteredAction[] => {
        return notes.slice(0, 50).map(note => ({
            id: `note:${note.id}`,
            label: note.title || 'Untitled',
            description: getTextFromHtml(note.content).slice(0, 100),
            category: 'Notes',
            run: () => {
                window.dispatchEvent(new CustomEvent('action:openNote', { detail: { noteId: note.id } }));
            },
            priority: 10,
            tags: ['note', ...note.tags],
            inPalette: true,
        }));
    }, [notes]);

    // Search and rank results
    useEffect(() => {
        const allActions = [...paletteActions, ...noteActions];
        const scored: ScoredAction[] = [];

        for (const action of allActions) {
            const searchText = `${action.label} ${action.description || ''} ${action.tags?.join(' ') || ''} ${action.category || ''}`;
            if (fuzzyMatch(query, searchText)) {
                // Score: exact prefix match > fuzzy match, higher priority > lower
                let score = action.priority ?? 0;
                const labelLower = action.label.toLowerCase();
                const queryLower = query.toLowerCase();
                if (labelLower.startsWith(queryLower)) score += 1000;
                else if (labelLower.includes(queryLower)) score += 500;
                else score += 100;
                // Boost notes slightly lower than actions
                if (action.id.startsWith('note:')) score -= 50;
                scored.push({ action, score, matchedText: action.label });
            }
        }

        scored.sort((a, b) => b.score - a.score);
        setResults(scored.slice(0, 100));
        setSelectedIndex(0);
    }, [query, paletteActions, noteActions]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        executeAction(results[selectedIndex].action);
                    }
                    break;
                case 'Tab':
                    // Allow tab for indentation in input
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const executeAction = useCallback((action: RegisteredAction) => {
        try {
            action.run(context);
            onAction?.(action.id);
            onClose();
        } catch (err) {
            console.error('[CommandPalette] Action failed:', err);
        }
    }, [context, onAction, onClose]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    }, []);

    if (!isOpen) return null;

    const selectedAction = results[selectedIndex];

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Palette */}
            <div className="relative w-full max-w-2xl bg-gray-900/95 border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden animate-slide-down">
                {/* Input */}
                <div className="p-4 border-b border-gray-700/50">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
                        <Input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            placeholder="Type a command or search notes…"
                            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 bg-gray-800/50 rounded">
                            ⌘P
                        </kbd>
                    </div>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto p-2"
                    role="listbox"
                    aria-label="Commands"
                >
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                            {query ? 'No matching commands or notes' : 'Type to search commands and notes'}
                        </div>
                    ) : (
                        <>
                            {results.map((result, index) => {
                                const action = result.action;
                                const categoryInfo = getCategoryInfo(action.category);
                                const isSelected = index === selectedIndex;
                                const isNote = action.id.startsWith('note:');

                                return (
                                    <button
                                        key={action.id}
                                        type="button"
                                        onClick={() => executeAction(action)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                            isSelected
                                                ? 'bg-green-500/15 text-white'
                                                : 'text-gray-300 hover:bg-gray-800/50'
                                        }`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <categoryInfo.icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-green-400' : 'text-gray-500'}`} aria-hidden="true" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="font-medium truncate">
                                                    {highlightMatch(action.label, query)}
                                                </span>
                                                {action.shortcutDisplay && (
                                                    <kbd className="ml-auto px-2 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-800/50 rounded border border-gray-700/50">
                                                        {action.shortcutDisplay}
                                                    </kbd>
                                                )}
                                            </div>
                                            {action.description && (
                                                <div className="text-[11px] text-gray-500 truncate">
                                                    {highlightMatch(action.description, query)}
                                                </div>
                                            )}
                                        </div>
                                        {isNote && (
                                            <span className="px-2 py-0.5 text-[10px] text-gray-500 bg-gray-800/50 rounded border border-gray-700/50">
                                                Note
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
                    <span>↑↓ navigate • Enter select • Esc close</span>
                    <span className="flex items-center gap-1">
                        <MenuIcon className="w-3 h-3" aria-hidden="true" />
                        Command Palette
                    </span>
                </div>
            </div>
        </div>
    );
}