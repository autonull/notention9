import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Command as CommandIcon, Loader2 } from 'lucide-react';

interface CommandItem {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
    icon?: React.ReactNode;
    action: () => void;
    keywords: string[];
    category: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    items: CommandItem[];
}

const CommandPalette = ({ isOpen, onClose, items }: CommandPaletteProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredItems = useMemo(() => {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.keywords.some(k => k.toLowerCase().includes(q))
        );
    }, [items, query]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (filteredItems.length > 0 && listRef.current) {
            const selectedElement = listRef.current.querySelector('[data-selected="true"]');
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedIndex, filteredItems]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
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
                    filteredItems[selectedIndex].action();
                    onClose();
                }
                break;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command or search..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-40 py-3 text-white text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-500">
                            <CommandIcon size={18} />
                            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">⌘K</kbd>
                        </div>
                    </div>
                </div>

                <div ref={listRef} className="max-h-96 overflow-auto custom-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                            <p>No commands found</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {filteredItems.map((item, index) => (
                                <button
                                    key={item.id}
                                    onClick={() => { item.action(); onClose(); }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full px-4 py-3 rounded-lg text-left transition-colors flex items-center gap-4 ${
                                        index === selectedIndex
                                            ? 'bg-indigo-900/50 border border-indigo-500/50'
                                            : 'hover:bg-gray-700'
                                    }`}
                                    data-selected={index === selectedIndex}
                                >
                                    {item.icon && <span className="text-indigo-400">{item.icon}</span>}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{item.label}</div>
                                        <div className="text-sm text-gray-400 truncate">{item.description}</div>
                                    </div>
                                    {item.shortcut && (
                                        <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400 font-mono ml-2">
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;