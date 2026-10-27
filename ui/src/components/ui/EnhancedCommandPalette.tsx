import React, {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {cn} from '../../utils/ui';
import {CommandPaletteItem} from './Overlay';
import {useFocusTrap} from './Overlay';
import {SearchSparkleIcon, XIcon, SearchIcon, SettingsIcon} from '../ui/icons';
import {Button} from './Button';
import {COMMAND_PALETTE_SHORTCUTS} from '../../config/shortcuts';
import {useIsMobile} from '../../hooks/useMediaQuery';

const RECENT_STORAGE_KEY = 'notention-command-palette-recent';
const RECENT_SEARCHES_KEY = 'notention-command-palette-searches';

function loadRecentItems(): CommandPaletteItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveRecentItems(items: CommandPaletteItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Ignore storage errors
    }
}

function loadRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveRecentSearches(searches: string[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch {
        // Ignore storage errors
    }
}

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



const SEARCH_SYNTAX_HINTS = [
    {syntax: '#tag', description: 'Find notes by tag'},
    {syntax: 'key:value', description: 'Find notes by property (e.g. type:task)'},
    {syntax: 'word', description: 'Search note titles and content'},
];

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
    persistRecent?: boolean;
}

export function EnhancedCommandPalette({
    isOpen,
    onClose,
    items,
    placeholder = 'Type a command or search... (#tag, key:value)',
    title,
    className = '',
    showShortcuts = true,
    showRecent = true,
    recentItems: initialRecentItems = [],
    maxRecent = 8,
    onRecentChange,
    fuzzySearch = true,
    persistRecent = true,
}: EnhancedCommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [recentItems, setRecentItems] = useState<CommandPaletteItem[]>(() => 
        persistRecent ? loadRecentItems() : initialRecentItems
    );
    const [recentSearches, setRecentSearches] = useState<string[]>(() => 
        persistRecent ? loadRecentSearches() : []
    );
    const isMobile = useIsMobile();

    const contentRef = useFocusTrap(isOpen, onClose);

    useEffect(() => {
        if (initialRecentItems.length > 0 && !persistRecent) {
            setRecentItems(initialRecentItems);
        }
    }, [initialRecentItems, persistRecent]);

    useEffect(() => {
        if (persistRecent && recentItems.length > 0) {
            saveRecentItems(recentItems);
        }
    }, [recentItems, persistRecent]);

    // Save recent searches when query changes and user submits
    const addRecentSearch = useCallback((search: string) => {
        if (!search.trim()) return;
        setRecentSearches(prev => {
            const filtered = prev.filter(s => s !== search);
            const updated = [search, ...filtered].slice(0, 10);
            if (persistRecent) saveRecentSearches(updated);
            return updated;
        });
    }, [persistRecent]);

    const handleRecentChange = useCallback((items: CommandPaletteItem[]) => {
        setRecentItems(items);
        onRecentChange?.(items);
    }, [onRecentChange]);

    const filteredItems = useMemo(() => {
        if (!query) {
            const result: CommandPaletteItem[] = [];
            if (showRecent && recentItems.length > 0) {
                result.push(...recentItems.slice(0, maxRecent).map((item, _i) => ({
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
            .filter((item): item is NonNullable<typeof item> => item !== null);

        const scoredWithMatches = scored as (CommandPaletteItem & {_fuzzyMatch?: FuzzyMatch; _matchText?: string})[];

        scoredWithMatches.sort((a, b) => {
            if (a._fuzzyMatch && b._fuzzyMatch) {
                return b._fuzzyMatch.score - a._fuzzyMatch.score;
            }
            if (a._fuzzyMatch) return -1;
            if (b._fuzzyMatch) return 1;
            return 0;
        });

        return scoredWithMatches;
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
                    item.action();
                    if (showRecent && !recentItems.some(r => r.id === item.id)) {
                        handleRecentChange([item, ...recentItems].slice(0, maxRecent));
                    }
                    onClose();
                } else if (query.trim()) {
                    // Add to recent searches when submitting a custom query
                    addRecentSearch(query);
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
        if (showRecent && !recentItems.some(r => r.id === item.id)) {
            handleRecentChange([item, ...recentItems].slice(0, maxRecent));
        }
        onClose();
    };

    if (!isOpen) return null;

    const isEmptyQuery = !query.trim();
    const showEmptyState = isEmptyQuery && !showHelp && (!showRecent || recentItems.length === 0);
    const regularItems = filteredItems.filter(item => !item.id.startsWith('recent-'));

    const containerStyle = isMobile ? 'fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm animate-fade-in' : 'fixed inset-0 z-[600] flex items-start justify-center pt-[10vh] bg-black/70 backdrop-blur-sm animate-fade-in';
    const dialogStyle = isMobile ? 'bg-gray-800 rounded-t-2xl shadow-2xl border border-gray-700 w-full overflow-hidden flex flex-col h-full animate-slide-in-up' : 'bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-3xl overflow-hidden flex flex-col max-h-[70vh] animate-slide-in-up';
    const contentPadding = isMobile ? 'p-4' : 'p-2';

    // Render shortcut categories
    const renderShortcuts = () => (
        <div className="space-y-4 animate-fade-in stagger-children">
            {COMMAND_PALETTE_SHORTCUTS.map((group, groupIndex) => (
                <div key={group.category} className="stagger-children" style={{animationDelay: `${groupIndex * 50}ms`}}>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {group.category}
                    </div>
                    <div className="space-y-2 px-3">
                        {group.shortcuts.map((shortcut) => (
                            <div key={shortcut.keys.join('+')} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-700/50 transition-colors touch-target">
                                <span className="text-sm text-gray-300">{shortcut.label}</span>
                                <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded uppercase tracking-wider">
                                    {shortcut.keys.join(' + ')}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {/* Search Syntax Hints */}
            <div className="stagger-children">
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Search Syntax
                </div>
                <div className="space-y-1 px-3">
                    {SEARCH_SYNTAX_HINTS.map((hint, index) => (
                        <div key={index} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/30 transition-colors touch-target">
                            <code className="text-sm font-mono text-blue-300 bg-gray-800/50 px-2 py-0.5 rounded">{hint.syntax}</code>
                            <span className="text-sm text-gray-400 ml-3">{hint.description}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="pt-2 border-t border-gray-700/50">
                <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-400">
                    <span>Type to search commands, notes, tags (<kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">#tag</kbd>), properties (<kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">key:value</kbd>)</span>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={containerStyle}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Command Palette'}
        >
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(dialogStyle, className)}
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
                            className="w-full bg-transparent pl-10 pr-12 py-3 text-lg text-white placeholder-gray-500 focus:outline-none"
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                            spellCheck={false}
                            aria-autocomplete="list"
                            aria-controls="command-palette-list"
                            aria-activedescendant={filteredItems[selectedIndex]?.id}
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-200 rounded-full hover:bg-gray-700 transition-colors touch-target"
                                aria-label="Clear search"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        )}
                        <kbd className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded touch-target">Esc</kbd>
                    </div>
                </div>

                <div
                    id="command-palette-list"
                    className={`${contentPadding} overflow-y-auto flex-1 space-y-1 custom-scrollbar`}
                    role="listbox"
                    aria-label="Commands and notes"
                >
                    {showEmptyState && (
                        <div className="p-8 text-center animate-fade-in">
                            <div className="p-3 bg-gray-700/50 rounded-xl w-fit mx-auto mb-4 text-gray-400">
                                <SearchSparkleIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Welcome to Command Palette</h3>
                            <p className="text-gray-400 mb-6 max-w-xs mx-auto">
                                Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">⌘K</kbd> to open, type to search commands, notes, tags (<kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">#tag</kbd>), or properties (<kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">key:value</kbd>).
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 mx-auto max-w-xs">
                                <Button
                                    onClick={() => setShowHelp(true)}
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<SettingsIcon className="w-4 h-4"/>}
                                    className="touch-target-48"
                                >
                                    View Shortcuts
                                </Button>
                            </div>
                        </div>
                    )}

                    {!showEmptyState && filteredItems.length === 0 && query && (
                        <div className="p-8 text-center animate-fade-in">
                            <div className="p-3 bg-gray-700/50 rounded-xl w-fit mx-auto mb-4 text-gray-400">
                                <SearchSparkleIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">No results for &ldquo;{query}&rdquo;</h3>
                            <p className="text-gray-400 mb-4">Try a different search term or check your spelling.</p>
                            <div className="flex flex-wrap justify-center gap-2 mx-auto max-w-xs">
                                <Button
                                    onClick={() => setQuery('')}
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<XIcon className="w-4 h-4"/>}
                                    className="touch-target-48"
                                >
                                    Clear Search
                                </Button>
                            </div>
                        </div>
                    )}

                    {!showEmptyState && filteredItems.length === 0 && !query && !showHelp && (
                        <>
                            {/* Recent Searches */}
                            {showRecent && recentSearches.length > 0 && (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                        <span>Recent Searches ({recentSearches.length})</span>
                                        <Button
                                            onClick={() => setRecentSearches([])}
                                            variant="ghost"
                                            size="xs"
                                            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded transition-colors touch-target"
                                            aria-label="Clear recent searches"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    {recentSearches.slice(0, maxRecent).map((search, index) => (
                                        <button
                                            key={`recent-search-${index}`}
                                            onClick={() => {
                                                setQuery(search);
                                                inputRef.current?.focus();
                                            }}
                                            className="w-full flex items-center touch-target transition-colors text-left hover:bg-gray-700/50"
                                            role="option"
                                            aria-selected={false}
                                        >
                                            <div className="mr-4 flex-shrink-0 w-6 h-6 text-gray-400">
                                                <SearchIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="font-medium truncate text-gray-200">
                                                    {search}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Recent Items */}
                            {showRecent && recentItems.length > 0 && (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                        <span>Recent ({recentItems.length})</span>
                                        <Button
                                            onClick={() => handleRecentChange([])}
                                            variant="ghost"
                                            size="xs"
                                            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded transition-colors touch-target"
                                            aria-label="Clear recent items"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    {recentItems.slice(0, maxRecent).map((item, index) => (
                                        <button
                                            key={`recent-${item.id}`}
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={cn(
                                                'w-full flex items-center touch-target transition-colors',
                                                selectedIndex === index ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                                            )}
                                            role="option"
                                            aria-selected={selectedIndex === index}
                                        >
                                            <div className={cn('mr-4 flex-shrink-0 w-6 h-6', selectedIndex === index ? 'text-blue-400' : 'text-gray-400')}>
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
                                <div className="pt-4 space-y-4 animate-fade-in">
                                    {renderShortcuts()}
                                </div>
                            )}
                        </>
                    )}

                    {showHelp && !query && (
                        <div className="p-4 space-y-4 animate-fade-in stagger-children">
                            <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Help & Shortcuts
                            </div>
                            {renderShortcuts()}
                        </div>
                    )}

                    {regularItems.map((item, index) => {
                        const displayIndex = recentItems.length > 0 && showRecent && !query ? index + recentItems.length : index;
                        const showCategory = item.category && (index === 0 || regularItems[index - 1].category !== item.category);
                        const match = (item as CommandPaletteItem & {_fuzzyMatch?: FuzzyMatch})._fuzzyMatch;
                        const matchText = (item as CommandPaletteItem & {_matchText?: string})._matchText;

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
                                        'w-full flex items-center touch-target transition-colors',
                                        displayIndex === selectedIndex ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                                    )}
                                    role="option"
                                    aria-selected={displayIndex === selectedIndex}
                                    id={item.id}
                                >
                                    <div className={cn('mr-4 flex-shrink-0 w-6 h-6', displayIndex === selectedIndex ? 'text-blue-400' : 'text-gray-400')}>
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

                <div className={`p-2 border-t border-gray-700/50 text-xs text-gray-500 flex flex-wrap gap-4 justify-between ${isMobile ? 'px-4 py-3' : 'px-4 py-2'} bg-gray-900/30`}>
                    <span>↑↓ navigate · ↵ select · Esc close · ? help</span>
                    <div className="flex items-center gap-4">
                        {query && <span>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</span>}
                        {showRecent && recentItems.length > 0 && !query && (
                            <Button
                                onClick={() => handleRecentChange([])}
                                variant="ghost"
                                size="xs"
                                className="text-gray-400 hover:text-gray-200 underline transition-colors touch-target"
                            >
                                Clear recent
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}