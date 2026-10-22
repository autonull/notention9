import React, {useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '../../utils/ui';
import {CommandPaletteItem} from './Overlay';

interface FuzzyMatch {
    score: number;
    indices: [number, number][];
}

function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (!q) return {score: 1, indices: []};

    let score = 0;
    const indices: [number, number][] = [];
    let queryIdx = 0;
    let lastMatchIdx = -1;
    let consecutiveMatches = 0;

    for (let i = 0; i < t.length && queryIdx < q.length; i++) {
        if (t[i] === q[queryIdx]) {
            const isStartOfWord = i === 0 || !/[a-z0-9]/.test(t[i - 1]);
            const isConsecutive = i === lastMatchIdx + 1;

            let matchScore = 1;
            if (isStartOfWord) matchScore += 2;
            if (isConsecutive) {
                consecutiveMatches++;
                matchScore += consecutiveMatches * 0.5;
            } else {
                consecutiveMatches = 0;
            }
            if (q.length === 1) matchScore += 1;

            score += matchScore;
            indices.push([i, i]);
            lastMatchIdx = i;
            queryIdx++;
        }
    }

    if (queryIdx < q.length) return null;

    const lengthBonus = t.length > 0 ? Math.min(10 / t.length, 1) : 0;
    score += lengthBonus;

    return {score, indices};
}

function highlightMatch(text: string, indices: [number, number][]): React.ReactNode {
    if (!indices.length) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const [start, end] of indices) {
        if (start > lastIndex) {
            parts.push(text.slice(lastIndex, start));
        }
        parts.push(<mark key={start} className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{text.slice(start, end + 1)}</mark>);
        lastIndex = end + 1;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

export interface EnhancedCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    items: CommandPaletteItem[];
    placeholder?: string;
    title?: string;
    className?: string;
    showShortcuts?: boolean;
    showRecent?: boolean;
    recentItems?: CommandPaletteItem[];
    maxRecent?: number;
    onRecentChange?: (items: CommandPaletteItem[]) => void;
    fuzzySearch?: boolean;
}

const DEFAULT_SHORTCUTS = [
    {label: 'New Note', keys: ['⌘', 'N']},
    {label: 'Command Palette', keys: ['⌘', 'K']},
    {label: 'Search Notes', keys: ['⌘', 'F']},
    {label: 'Toggle Sidebar', keys: ['⌘', '\\']},
    {label: 'Save Note', keys: ['⌘', 'S']},
    {label: 'Next Note', keys: ['⌘', 'J']},
    {label: 'Previous Note', keys: ['⌘', 'K']},
    {label: 'Back to List', keys: ['Esc']},
    {label: 'Open Help', keys: ['?']},
];

export function EnhancedCommandPalette({
    isOpen,
    onClose,
    items,
    placeholder = 'Type a command or search...',
    title,
    className = '',
    showShortcuts = true,
    showRecent = true,
    recentItems = [],
    maxRecent = 5,
    onRecentChange,
    fuzzySearch = true,
}: EnhancedCommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [showHelp, setShowHelp] = useState(false);

    const filteredItems = useMemo(() => {
        if (!query) {
            const result: CommandPaletteItem[] = [];
            if (showRecent && recentItems.length > 0) {
                result.push(...recentItems.slice(0, maxRecent).map((item, i) => ({
                    ...item,
                    id: `recent-${item.id}`,
                    category: 'Recent',
                    description: item.description || 'Recently used',
                })));
            }
            result.push(...items);
            return result;
        }

        const q = query.toLowerCase();
        const scored = items
            .map(item => {
                const searchText = [
                    item.label,
                    item.description || '',
                    ...(item.keywords || []),
                    item.shortcut || '',
                ].join(' ');

                if (fuzzySearch) {
                    const match = fuzzyMatch(query, searchText);
                    if (!match) return null;
                    return {...item, _fuzzyMatch: match, _matchText: searchText};
                }

                const includes = item.label.toLowerCase().includes(q) ||
                    item.description?.toLowerCase().includes(q) ||
                    item.keywords?.some(k => k.toLowerCase().includes(q)) ||
                    item.shortcut?.toLowerCase().includes(q);

                return includes ? {...item, _fuzzyMatch: null, _matchText: searchText} : null;
            })
            .filter((item): item is CommandPaletteItem & {_fuzzyMatch?: FuzzyMatch; _matchText?: string} => item !== null);

        scored.sort((a, b) => {
            if (a._fuzzyMatch && b._fuzzyMatch) {
                return b._fuzzyMatch.score - a._fuzzyMatch.score;
            }
            if (a._fuzzyMatch) return -1;
            if (b._fuzzyMatch) return 1;
            return 0;
        });

        return scored;
    }, [items, query, fuzzySearch, showRecent, recentItems, maxRecent]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setShowHelp(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    const item = filteredItems[selectedIndex];
                    if (showRecent && recentItems.length > 0 && selectedIndex < recentItems.length) {
                        // Recent item selected
                    }
                    item.action();
                    if (showRecent && onRecentChange && !recentItems.some(r => r.id === item.id)) {
                        onRecentChange([item, ...recentItems].slice(0, maxRecent));
                    }
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
            case '?':
                if (!e.metaKey && !e.ctrlKey && !e.altKey && query === '') {
                    e.preventDefault();
                    setShowHelp(!showHelp);
                }
                break;
            case '/':
                if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
                    e.preventDefault();
                    setQuery('');
                    inputRef.current?.focus();
                }
                break;
        }
    };

    const handleItemClick = (item: CommandPaletteItem) => {
        item.action();
        if (showRecent && onRecentChange && !recentItems.some(r => r.id === item.id)) {
            onRecentChange([item, ...recentItems].slice(0, maxRecent));
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[600] flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Command Palette'}
        >
            <div
                ref={listRef}
                className={cn(
                    'bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-3xl overflow-hidden flex flex-col max-h-[70vh] animate-slide-in-up',
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center p-4 border-b border-gray-700/50">
                    {title && <h3 className="font-semibold text-white mr-4">{title}</h3>}
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent pl-10 pr-4 py-2.5 text-lg text-white placeholder-gray-500 focus:outline-none"
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                            spellCheck={false}
                            aria-autocomplete="list"
                            aria-controls="command-palette-list"
                            aria-activedescendant={filteredItems[selectedIndex]?.id}
                        />
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-1.5 rounded">Esc</kbd>
                    </div>
                </div>

                <div
                    id="command-palette-list"
                    className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar"
                    role="listbox"
                    aria-label="Commands and notes"
                >
                    {filteredItems.length === 0 && query && (
                        <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
                    )}

                    {filteredItems.length === 0 && !query && !showHelp && (
                        <>
                            {showRecent && recentItems.length > 0 && (
                                <div className="space-y-2">
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <span>Recent ({recentItems.length})</span>
                                    </div>
                                    {recentItems.slice(0, maxRecent).map((item, index) => (
                                        <button
                                            key={`recent-${item.id}`}
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                'w-full flex items-center p-3 rounded-lg transition-colors',
                                                selectedIndex === index ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                                            )}
                                            role="option"
                                            aria-selected={selectedIndex === index}
                                        >
                                            <div className={cn('mr-4 flex-shrink-0 w-5 h-5', selectedIndex === index ? 'text-blue-400' : 'text-gray-400')}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className={cn('font-medium truncate', selectedIndex === index ? 'text-white' : 'text-gray-200')}>
                                                    {item.label}
                                                </div>
                                                {item.description && (
                                                    <div className={cn('text-sm truncate', selectedIndex === index ? 'text-blue-200' : 'text-gray-500')}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                            {item.shortcut && (
                                                <kbd className={cn('ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider', selectedIndex === index ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500')}>
                                                    {item.shortcut}
                                                </kbd>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {showShortcuts && (
                                <div className="pt-4 space-y-4">
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        Keyboard Shortcuts
                                    </div>
                                    <div className="space-y-2 px-3">
                                        {DEFAULT_SHORTCUTS.map((shortcut) => (
                                            <div key={shortcut.keys.join('+')} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                                                <span className="text-sm text-gray-300">{shortcut.label}</span>
                                                <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded uppercase tracking-wider">
                                                    {shortcut.keys.join(' + ')}
                                                </kbd>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {showHelp && !query && (
                        <div className="p-4 space-y-4 animate-fade-in">
                            <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Help & Shortcuts
                            </div>
                            <div className="space-y-3 px-3">
                                {DEFAULT_SHORTCUTS.map((shortcut) => (
                                    <div key={shortcut.keys.join('+')} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                                        <span className="text-sm text-gray-300">{shortcut.label}</span>
                                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded uppercase tracking-wider">
                                            {shortcut.keys.join(' + ')}
                                        </kbd>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-400">
                                        <span>Type to search commands, notes, tags (#), properties (key:value)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {filteredItems.filter(item => !item.id.startsWith('recent-')).map((item, index) => {
                        const displayIndex = recentItems.length > 0 && showRecent && !query ? index + recentItems.length : index;
                        const showCategory = item.category && (index === 0 || filteredItems[index - 1].category !== item.category);
                        const match = item._fuzzyMatch;
                        const matchText = item._matchText;

                        return (
                            <React.Fragment key={item.id}>
                                {showCategory && (
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {item.category}
                                    </div>
                                )}
                                <button
                                    onClick={() => handleItemClick(item)}
                                    onMouseEnter={() => setSelectedIndex(displayIndex)}
                                    className={cn(
                                        'w-full flex items-center p-3 rounded-lg transition-colors',
                                        displayIndex === selectedIndex ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                                    )}
                                    role="option"
                                    aria-selected={displayIndex === selectedIndex}
                                    id={item.id}
                                >
                                    <div className={cn('mr-4 flex-shrink-0 w-5 h-5', displayIndex === selectedIndex ? 'text-blue-400' : 'text-gray-400')}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className={cn('font-medium truncate', displayIndex === selectedIndex ? 'text-white' : 'text-gray-200')}>
                                            {match && matchText ? highlightMatch(item.label, match.indices) : item.label}
                                        </div>
                                        {item.description && (
                                            <div className={cn('text-sm truncate', displayIndex === selectedIndex ? 'text-blue-200' : 'text-gray-500')}>
                                                {match && matchText ? highlightMatch(item.description, match.indices) : item.description}
                                            </div>
                                        )}
                                    </div>
                                    {item.shortcut && (
                                        <kbd className={cn('ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider', displayIndex === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500')}>
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between px-4 py-2 bg-gray-900/30">
                    <span>↑↓ navigate · ↵ select · Esc close · ? help</span>
                    {query && <span>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</span>}
                </div>
            </div>
        </div>
    );
}