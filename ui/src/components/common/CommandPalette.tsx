import React, {useEffect, useRef, useState} from 'react';
import {Note, getTextFromHtml} from '@notention/core';
import {ClockIcon, NoteIcon, PlusIcon, SearchIcon, TagIcon} from '../common/icons';

interface CommandItem {
    id: string;
    type: 'command' | 'note';
    label: string;
    description?: string;
    icon?: React.ReactElement;
    action: () => void;
    category?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    notes: Note[];
    onSelectNote: (noteId: string) => void;
    onCreateNote?: (title: string) => void;
    commands: {
        label: string;
        icon: React.ReactElement;
        action: () => void;
    }[];
}

export function CommandPalette({
                                   isOpen,
                                   onClose,
                                   notes,
                                   onSelectNote,
                                   onCreateNote,
                                   commands,
                               }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            // Small timeout to ensure render
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredNotes = query ? notes
        .filter((note) => {
            const q = query.toLowerCase();

            // Tag Search
            if (q.startsWith('#')) {
                const tagQuery = q.slice(1);
                return note.tags.some(tag => tag.toLowerCase().includes(tagQuery));
            }

            // Semantic Property Search (key:value)
            if (q.includes(':')) {
                const [key, value] = q.split(':').map(s => s.trim());
                if (key && value) {
                    return note.properties.some(p =>
                        p.key.toLowerCase().includes(key) &&
                        p.values.some(v => v.toLowerCase().includes(value))
                    );
                }
                // Just key match if value is empty?
                if (key && !value) {
                    return note.properties.some(p => p.key.toLowerCase().includes(key));
                }
            }

            return (
                note.title.toLowerCase().includes(q) ||
                note.content.toLowerCase().includes(q)
            );
        })
        .slice(0, 10) : []; // Only show notes when searching

    const filteredCommands = query
        ? commands.filter((cmd) =>
            cmd.label.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    const recentNotes = !query ? notes.slice(0, 5) : [];

    const allItems: CommandItem[] = [
        ...(query && onCreateNote
            ? [
                {
                    id: 'create-note',
                    type: 'command' as const,
                    label: `Create new note: "${query}"`,
                    icon: <PlusIcon className="h-5 w-5"/>,
                    action: () => onCreateNote(query),
                    category: 'Actions'
                },
            ]
            : []),
        ...filteredCommands.map((cmd) => ({
            id: `cmd-${cmd.label}`,
            type: 'command' as const,
            label: cmd.label,
            icon: cmd.icon,
            action: cmd.action,
            category: cmd.label.toLowerCase().includes('go to') || ['Dashboard', 'Notes', 'Map', 'Network', 'Ontology', 'Chat', 'Settings', 'Trash', 'Timeline'].some(v => cmd.label.includes(v)) ? 'Navigation' : 'Actions'
        })),
        ...recentNotes.map((note) => ({
            id: `recent-${note.id}`,
            type: 'note' as const,
            label: note.title || 'Untitled',
            description: note.content.slice(0, 50).replace(/<[^>]*>/g, ''), // Strip HTML
            icon: <ClockIcon className="h-5 w-5"/>,
            action: () => onSelectNote(note.id),
            category: 'Recent Notes'
        })),
        ...filteredNotes.map((note) => ({
            id: note.id,
            type: 'note' as const,
            label: note.title || 'Untitled',
            description: getTextFromHtml(note.content).slice(0, 50),
            icon: <NoteIcon className="h-5 w-5"/>,
            action: () => onSelectNote(note.id),
            category: 'Notes'
        })),
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % allItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(
                (prev) => (prev - 1 + allItems.length) % allItems.length
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (allItems[selectedIndex]) {
                allItems[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[60vh] transform transition-all animate-slide-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center p-4 border-b border-gray-700/50">
                    <SearchIcon className="h-5 w-5 text-gray-400 mr-3"/>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none"
                        placeholder="Type a command or search notes..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">Esc</div>
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {allItems.length === 0 && query && (
                        <div className="p-8 text-center flex flex-col items-center gap-4">
                            <div className="text-gray-500">No results found for "{query}"</div>
                            {onCreateNote && (
                                <button
                                    onClick={() => {
                                        onCreateNote(query);
                                        onClose();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <PlusIcon className="h-5 w-5"/>
                                    <span>Create new note: "{query}"</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Default View: Show Shortcuts if no query */}
                    {allItems.length > 0 ? (
                        allItems.map((item, index) => {
                            const showCategory = item.category && (index === 0 || allItems[index - 1].category !== item.category);
                            return (
                                <React.Fragment key={item.id}>
                                    {showCategory && (
                                        <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            {item.category}
                                        </div>
                                    )}
                                    <div
                                        className={`
                                            flex items-center p-3 rounded-lg cursor-pointer transition-colors
                                            ${index === selectedIndex ? 'bg-blue-600/20 border border-blue-500/50' : 'border border-transparent hover:bg-gray-700/50'}
                                        `}
                                        onClick={() => {
                                            item.action();
                                            onClose();
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                    >
                                        <div
                                            className={`mr-4 flex-shrink-0 ${index === selectedIndex ? 'text-blue-400' : 'text-gray-400'}`}>
                                            {item.icon}
                                        </div>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className={`font-medium truncate ${index === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                                        {item.label}
                                    </div>
                                    {item.description && (
                                        <div
                                            className={`text-sm truncate ${index === selectedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                                {item.type === 'command' ? (
                                    <div
                                        className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${index === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500'}`}>
                                        CMD
                                    </div>
                                ) : (
                                    <div
                                        className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${index === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500'}`}>
                                        NOTE
                                    </div>
                                )}
                                    </div>
                                </React.Fragment>
                            );
                        })
                    ) : (
                        !query && (
                            <div className="p-4 space-y-6">
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Keyboard Shortcuts</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="flex justify-between text-gray-400">
                                            <span>New Note</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Ctrl+N</code>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Search Sidebar</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Ctrl+/</code>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Save Note</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Ctrl+S</code>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Toggle Sidebar</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Ctrl+\ or Ctrl+B</code>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Back to List</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Alt+Left</code>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Dev Mode</span>
                                            <code className="bg-gray-700/50 px-1.5 rounded text-gray-300 border border-gray-600/30">Ctrl+Shift+D</code>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Semantic Syntax</h3>
                                    <div className="space-y-2 text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <code className="text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded">[key:is:value]</code>
                                            <span>Define property</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">#tag</code>
                                            <span>Add tag</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div
                    className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between px-4 py-2 bg-gray-900/30">
                    <div>
                        <span className="font-semibold">ProTip:</span> Use <code
                        className="bg-gray-700 px-1 rounded text-gray-300">#</code> for tags, <code
                        className="bg-gray-700 px-1 rounded text-gray-300">key:value</code> for properties.
                    </div>
                    <div className="flex gap-4">
                        <span><kbd className="font-sans">↑↓</kbd> navigate</span>
                        <span><kbd className="font-sans">↵</kbd> select</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
