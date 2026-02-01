import React, { useState, useEffect, useRef } from 'react';
import { Note } from '@notention/core';
import {
  SearchIcon,
  NoteIcon,
  PlusIcon,
} from '../common/icons';

interface CommandItem {
  id: string;
  type: 'command' | 'note';
  label: string;
  description?: string;
  icon?: React.ReactElement;
  action: () => void;
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

  const filteredNotes = notes
    .filter((note) => {
        const q = query.toLowerCase();
        if (q.startsWith('#')) {
            const tagQuery = q.slice(1);
            return note.tags.some(tag => tag.toLowerCase().includes(tagQuery));
        }
        return (
            note.title.toLowerCase().includes(q) ||
            note.content.toLowerCase().includes(q)
        );
    })
    .slice(0, 10); // Limit results

  const filteredCommands = query
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const allItems: CommandItem[] = [
    ...(query && onCreateNote
      ? [
          {
            id: 'create-note',
            type: 'command' as const,
            label: `Create new note: "${query}"`,
            icon: <PlusIcon className="h-5 w-5" />,
            action: () => onCreateNote(query),
          },
        ]
      : []),
    ...filteredCommands.map((cmd) => ({
      id: `cmd-${cmd.label}`,
      type: 'command' as const,
      label: cmd.label,
      icon: cmd.icon,
      action: cmd.action,
    })),
    ...filteredNotes.map((note) => ({
      id: note.id,
      type: 'note' as const,
      label: note.title || 'Untitled',
      description: note.content.slice(0, 50).replace(/<[^>]*>/g, ''), // Strip HTML
      icon: <NoteIcon className="h-5 w-5" />,
      action: () => onSelectNote(note.id),
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
          <SearchIcon className="h-5 w-5 text-gray-400 mr-3" />
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
            {allItems.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    <p>No results found.</p>
                </div>
            )}

            {allItems.map((item, index) => (
                <div
                    key={item.id}
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
                    <div className={`mr-4 flex-shrink-0 ${index === selectedIndex ? 'text-blue-400' : 'text-gray-400'}`}>
                        {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${index === selectedIndex ? 'text-white' : 'text-gray-200'}`}>
                            {item.label}
                        </div>
                        {item.description && (
                            <div className={`text-sm truncate ${index === selectedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                                {item.description}
                            </div>
                        )}
                    </div>
                    {item.type === 'command' ? (
                        <div className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${index === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500'}`}>
                            CMD
                        </div>
                    ) : (
                        <div className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${index === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500'}`}>
                            NOTE
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between px-4 py-2 bg-gray-900/30">
            <div>
                <span className="font-semibold">ProTip:</span> Use <code className="bg-gray-700 px-1 rounded text-gray-300">#</code> to search tags.
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
