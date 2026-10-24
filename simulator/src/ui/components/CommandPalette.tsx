import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Search, Command as CommandIcon, Loader2, Zap, History, Clock, HelpCircle } from 'lucide-react';

interface CommandItem {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
    icon?: React.ReactNode;
    action: () => void;
    keywords: string[];
    category: string;
    hidden?: boolean;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    items: CommandItem[];
    title?: string;
    placeholder?: string;
    showShortcuts?: boolean;
    showRecent?: boolean;
    maxRecent?: number;
}

const RECENT_STORAGE_KEY = 'simulator-command-palette-recent';
const MAX_RECENT_DEFAULT = 5;

function loadRecentItems(): CommandItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveRecentItems(items: CommandItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_DEFAULT)));
    } catch {
        // Ignore storage errors
    }
}

const SHORTCUT_CATEGORIES = [
    {
        category: 'Navigation',
        shortcuts: [
            { label: 'Studio', keys: ['1'] },
            { label: 'Library', keys: ['2'] },
            { label: 'Live Preview', keys: ['3'] },
        ]
    },
    {
        category: 'Actions',
        shortcuts: [
            { label: 'Command Palette', keys: ['⌘', 'K'] },
            { label: 'Show Help', keys: ['?'] },
            { label: 'Close Modals', keys: ['Esc'] },
        ]
    },
];

const renderShortcuts = () => (
    <div className="space-y-3 animate-fade-in">
        {SHORTCUT_CATEGORIES.map((group) => (
            <div key={group.category} className="space-y-2">
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {group.category}
                </div>
                <div className="space-y-1 px-3">
                    {group.shortcuts.map((shortcut) => (
                        <div key={shortcut.keys.join('+')} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors touch-target">
                            <span className="text-sm text-gray-300">{shortcut.label}</span>
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded uppercase tracking-wider">
                                {shortcut.keys.join(' + ')}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const CommandPalette = ({ 
    isOpen, 
    onClose, 
    items, 
    title = 'Command Palette',
    placeholder = 'Type a command or search...',
    showShortcuts = true,
    showRecent = true,
    maxRecent = MAX_RECENT_DEFAULT,
}: CommandPaletteProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [query, setQuery] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [recentItems, setRecentItems] = useState<CommandItem[]>(() => loadRecentItems());
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredItems = useMemo(() => {
        const baseItems = items.filter(item => !item.hidden);
        
        if (!query) {
            const result: CommandItem[] = [];
            if (showRecent && recentItems.length > 0) {
                result.push(...recentItems.slice(0, maxRecent).map((item, _i) => ({
                    ...item,
                    id: `recent-${item.id}`,
                    category: 'Recent',
                    description: item.description || 'Recently used',
                })));
            }
            result.push(...baseItems);
            return result;
        }

        const q = query.toLowerCase();
        return baseItems.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some(k => k.toLowerCase().includes(q)) ||
            item.shortcut?.toLowerCase().includes(q)
        );
    }, [items, query, showRecent, recentItems, maxRecent]);

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

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                onClose();
                break;
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    const item = filteredItems[selectedIndex];
                    item.action();
                    if (showRecent && !recentItems.some(r => r.id === item.id)) {
                        setRecentItems(prev => [item, ...prev.filter(r => r.id !== item.id)].slice(0, maxRecent));
                    }
                    onClose();
                }
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
    }, [filteredItems, onClose, query, recentItems, maxRecent, showRecent, showHelp]);

    const handleItemClick = useCallback((item: CommandItem) => {
        item.action();
        if (showRecent && !recentItems.some(r => r.id === item.id)) {
            const updated = [item, ...recentItems.filter(r => r.id !== item.id)].slice(0, maxRecent);
            setRecentItems(updated);
            saveRecentItems(updated);
        }
        onClose();
    }, [onClose, recentItems, maxRecent, showRecent]);

    if (!isOpen) return null;

    const isEmptyQuery = !query.trim();
    const showEmptyState = isEmptyQuery && !showHelp && (!showRecent || recentItems.length === 0);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 relative">
                    {title && <h3 className="font-semibold text-white mb-3">{title}</h3>}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-40 py-3 text-white text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoComplete="off"
                            spellCheck={false}
                            aria-autocomplete="list"
                            aria-controls="command-palette-list"
                            aria-activedescendant={filteredItems[selectedIndex]?.id}
                            autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-500">
                            <CommandIcon size={18} />
                            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">{navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}</kbd>
                        </div>
                    </div>
                </div>

                <div
                    ref={listRef}
                    id="command-palette-list"
                    className="max-h-[60vh] overflow-auto custom-scrollbar"
                    role="listbox"
                    aria-label="Commands"
                >
                    {showEmptyState && (
                        <div className="p-8 text-center animate-fade-in">
                            <div className="p-3 bg-gray-700/50 rounded-xl w-fit mx-auto mb-4 text-gray-400">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Welcome to Command Palette</h3>
                            <p className="text-gray-400 mb-6 max-w-xs mx-auto">
                                Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">⌘K</kbd> to open, type to search commands.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 mx-auto max-w-xs">
                                <button
                                    onClick={() => setShowHelp(true)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors touch-target-48"
                                >
                                    View Shortcuts
                                </button>
                            </div>
                        </div>
                    )}

                    {!showEmptyState && filteredItems.length === 0 && query && (
                        <div className="p-8 text-center animate-fade-in">
                            <div className="p-3 bg-gray-700/50 rounded-xl w-fit mx-auto mb-4 text-gray-400">
                                <Search size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">No results for "{query}"</h3>
                            <p className="text-gray-400 mb-4">Try a different search term.</p>
                            <button
                                onClick={() => setQuery('')}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors touch-target-48"
                            >
                                Clear Search
                            </button>
                        </div>
                    )}

                    {!showEmptyState && filteredItems.length === 0 && !query && !showHelp && (
                        <>
                            {/* Recent Items */}
                            {showRecent && recentItems.length > 0 && (
                                <div className="space-y-2 animate-fade-in p-2">
                                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                        <span>Recent ({recentItems.length})</span>
                                        <button
                                            onClick={() => { setRecentItems([]); saveRecentItems([]); }}
                                            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded transition-colors touch-target"
                                            aria-label="Clear recent items"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    {recentItems.slice(0, maxRecent).map((item, index) => (
                                        <button
                                            key={`recent-${item.id}`}
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors touch-target ${
                                                index === selectedIndex
                                                    ? 'bg-indigo-900/50 border border-indigo-500/50'
                                                    : 'hover:bg-gray-700'
                                            }`}
                                            role="option"
                                            aria-selected={index === selectedIndex}
                                        >
                                            <div className={`flex-shrink-0 w-5 h-5 ${index === selectedIndex ? 'text-indigo-400' : 'text-gray-400'}`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className={`font-medium truncate ${index === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                                                    {item.label}
                                                </div>
                                                {item.description && (
                                                    <div className={`text-sm truncate ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                            {item.shortcut && (
                                                <kbd className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${index === selectedIndex ? 'bg-indigo-500/30 text-indigo-200' : 'bg-gray-700 text-gray-500'}`}>
                                                    {item.shortcut}
                                                </kbd>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* All Commands */}
                            <div className="p-2 space-y-1 animate-fade-in">
                                {items
                                    .filter(item => !item.hidden)
                                    .map((item, index) => {
                                        const displayIndex = (showRecent && recentItems.length > 0) ? index + recentItems.length : index;
                                        const showCategory = item.category && (index === 0 || items[index - 1]?.category !== item.category);
                                        
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
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors touch-target ${
                                                        displayIndex === selectedIndex
                                                            ? 'bg-indigo-900/50 border border-indigo-500/50'
                                                            : 'hover:bg-gray-700'
                                                    }`}
                                                    role="option"
                                                    aria-selected={displayIndex === selectedIndex}
                                                    id={item.id}
                                                >
                                                    <div className={`flex-shrink-0 w-5 h-5 ${displayIndex === selectedIndex ? 'text-indigo-400' : 'text-gray-400'}`}>
                                                        {item.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className={`font-medium truncate ${displayIndex === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                                                            {item.label}
                                                        </div>
                                                        <div className={`text-sm truncate ${displayIndex === selectedIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                            {item.description}
                                                        </div>
                                                    </div>
                                                    {item.shortcut && (
                                                        <kbd className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${displayIndex === selectedIndex ? 'bg-indigo-500/30 text-indigo-200' : 'bg-gray-700 text-gray-500'}`}>
                                                            {item.shortcut}
                                                        </kbd>
                                                    )}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                            </div>

                            {/* Shortcuts Help */}
                            {showShortcuts && (
                                <div className="p-2 pt-4 animate-fade-in">
                                    {renderShortcuts()}
                                </div>
                            )}
                        </>
                    )}

                    {showHelp && !query && (
                        <div className="p-4 space-y-4 animate-fade-in">
                            <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Keyboard Shortcuts
                            </div>
                            {renderShortcuts()}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex flex-wrap gap-4 justify-between">
                    <span>↑↓ navigate · ↵ select · Esc close · ? help</span>
                    <div className="flex items-center gap-4">
                        {query && <span>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</span>}
                        {showRecent && recentItems.length > 0 && !query && (
                            <button
                                onClick={() => { setRecentItems([]); saveRecentItems([]); }}
                                className="text-gray-400 hover:text-gray-200 underline transition-colors touch-target"
                            >
                                Clear recent
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;