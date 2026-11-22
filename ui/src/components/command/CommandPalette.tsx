import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actionRegistry } from '@notention/core/ui';
import type { ActionContext, RegisteredAction } from '@notention/core/ui/actionRegistry';
import { Button } from '../ui/Button';
import { KeyIcon, SearchIcon, SearchSparkleIcon, MenuIcon, ChevronRightIcon, type LucideIcon } from '../ui/icons';
import { useView } from '../../hooks/useViewContext';
import { useNotes } from '../../hooks/useNotes';
import { modShortcut } from '../../utils/platform';
import { getTextFromHtml } from '@notention/core';
import { sanitizeHTML } from '../../utils/sanitize';
import { cn } from '../../utils/ui';
import { NetworkView } from '../views/NetworkView';
import { ChatPanel } from '../chat/ChatPanel';
import { NotePreview } from './NotePreview';
import { PALETTE_SCOPES } from '../../config/uiSurfaces';

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

/** First letters of each word, e.g. "Open Settings" → "os". */
function wordInitials(text: string): string {
    return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word[0].toLowerCase()).join('');
}

/**
 * Predictable relevance: contiguous label match, then acronym, then body text.
 * Scattered-letter matches are too noisy for a result list.
 */
function scoreMatch(query: string, action: RegisteredAction): number | null {
    const base = action.priority ?? 0;
    if (!query) return base;

    const q = query.toLowerCase();
    const label = action.label.toLowerCase();
    const description = (action.description ?? '').toLowerCase();

    if (label.startsWith(q)) return 3000 + base;
    if (label.includes(q)) return 2000 + base;
    if (wordInitials(action.label).startsWith(q)) return 1500 + base;
    if (description.includes(q)) return 1000 + base;
    return null;
}

function highlightMatch(text: string, query: string): React.ReactNode {
    const term = query.trim().toLowerCase();
    const index = term ? text.toLowerCase().indexOf(term) : -1;
    if (index === -1) return text;
    return (
        <>
            {text.slice(0, index)}
            <mark className="rounded-sm bg-[var(--app-accent-soft)] px-0.5 text-[var(--app-text)]">{text.slice(index, index + term.length)}</mark>
            {text.slice(index + term.length)}
        </>
    );
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
    const [scope, setScope] = useState<'search' | 'explore' | 'chat'>('search');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
            const score = scoreMatch(query, action);
            if (score !== null) {
                // Notes rank below commands of equal relevance
                const adjusted = action.id.startsWith('note:') ? score - 50 : score;
                scored.push({action, score: adjusted, matchedText: action.label});
            }
        }

        scored.sort((a, b) => b.score - a.score);
        setResults(scored.slice(0, 100));
        setSelectedIndex(0);
        setIsPreviewOpen(false);
    }, [query, paletteActions, noteActions]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    useEffect(() => {
        const openSearch = () => setScope('search');
        const openExplore = () => setScope('explore');
        const openChat = () => setScope('chat');
        window.addEventListener('open-search', openSearch);
        window.addEventListener('open-explore', openExplore);
        window.addEventListener('open-chat', openChat);
        return () => {
            window.removeEventListener('open-search', openSearch);
            window.removeEventListener('open-explore', openExplore);
            window.removeEventListener('open-chat', openChat);
        };
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (scope !== 'search' && e.key !== 'Escape') return;
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    if (isPreviewOpen) setIsPreviewOpen(false);
                    else onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                    setIsPreviewOpen(false);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(i => Math.max(i - 1, 0));
                    setIsPreviewOpen(false);
                    break;
                case 'ArrowRight':
                    if (results[selectedIndex]?.action.id.startsWith('note:')) {
                        e.preventDefault();
                        setIsPreviewOpen(open => !open);
                    }
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
    }, [isOpen, results, selectedIndex, onClose, scope, isPreviewOpen]);

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
        setIsPreviewOpen(false);
    }, []);

    if (!isOpen) return null;

    const selectedAction = results[selectedIndex];
    const previewNote = isPreviewOpen && selectedAction?.action.id.startsWith('note:')
        ? notes.find(note => note.id === selectedAction.action.id.slice(5))
        : undefined;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Palette */}
            <div className={cn('relative w-full overflow-hidden rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)] animate-slide-in-down', scope === 'explore' || previewNote ? 'max-w-5xl' : 'max-w-[640px]')}>
                <div className="flex h-12 items-center gap-2.5 border-b border-[var(--app-line)] px-4">
                    <SearchIcon className="h-4 w-4 shrink-0 text-[var(--app-faint)]" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder="Search notes, details, tags, and commands…"
                        className="h-11 min-w-0 flex-1 bg-transparent px-0 text-[14px] text-[var(--app-text)] placeholder:text-[var(--app-faint)] outline-none focus:outline-none focus-visible:outline-none"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <kbd className="shrink-0 rounded border border-[var(--app-line)] bg-[var(--app-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--app-faint)]">
                        {modShortcut('K')}
                    </kbd>
                </div>

                <div className="flex h-10 items-center gap-1 border-b border-[var(--app-line)] px-3">
                    {PALETTE_SCOPES.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setScope(item.id)}
                            aria-pressed={scope === item.id}
                            className={cn(
                                'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors',
                                scope === item.id
                                    ? 'bg-[var(--app-hover)] text-[var(--app-text)]'
                                    : 'text-[var(--app-muted)] hover:text-[var(--app-text-secondary)]'
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                {scope === 'explore' ? (
                    <div className="h-[60vh] p-2">
                        <NetworkView/>
                    </div>
                ) : scope === 'chat' ? (
                    <div className="h-[60vh] p-2">
                        <ChatPanel className="h-full"/>
                    </div>
                ) : (
                <div className="flex max-h-[60vh] flex-col md:flex-row">
                <div
                    ref={listRef}
                    className="min-h-0 min-w-0 flex-1 overflow-y-auto p-1.5"
                    role="listbox"
                    aria-label="Search results"
                >
                    {results.length === 0 ? (
                        <div className="px-4 py-10 text-center text-[12px] text-[var(--app-muted)]">
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
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                                            isSelected
                                                ? 'bg-[var(--app-raised)] text-[var(--app-text)]'
                                                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)]'
                                        )}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <categoryInfo.icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-[var(--app-accent-text)]' : 'text-[var(--app-faint)]')} aria-hidden="true" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="truncate text-[13px] font-medium">
                                                    {highlightMatch(action.label, query)}
                                                </span>
                                                {action.shortcutDisplay && (
                                                    <kbd className="ml-auto shrink-0 rounded border border-[var(--app-line)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--app-faint)]">
                                                        {action.shortcutDisplay}
                                                    </kbd>
                                                )}
                                            </div>
                                            {action.description && (
                                                <div className="truncate text-[11px] text-[var(--app-muted)]">
                                                    {highlightMatch(action.description, query)}
                                                </div>
                                            )}
                                        </div>
                                        {isNote && results.some(result => !result.action.id.startsWith('note:')) && (
                                            <span className="shrink-0 rounded border border-[var(--app-line)] px-1.5 py-0.5 text-[11px] text-[var(--app-faint)]">
                                                Note
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>
                {previewNote && <NotePreview note={previewNote}/>}
                </div>
                )}

                {/* Footer hint */}
                <div className="flex items-center justify-between border-t border-[var(--app-line)] px-4 py-2 text-[11px] text-[var(--app-faint)]">
                    <span>{scope === 'search' ? '↑↓ navigate • → preview • Enter open • Esc close' : 'Esc close'}</span>
                    <span className="tabular-nums">
                        {scope === 'search'
                            ? results.length + ' ' + (results.length === 1 ? 'result' : 'results')
                            : scope === 'explore'
                                ? 'Public notes'
                                : 'Encrypted chat'}
                    </span>
                </div>
            </div>
        </div>
    );
}