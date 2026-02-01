import React from 'react';
import { SearchIcon, XCircleIcon } from '../common/icons';
import { IconButton } from '../common/IconButton';
import { Input } from '../common/Input';

interface SearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function Search({
  searchTerm,
  setSearchTerm,
}: SearchProps) {
  return (
    <div className="relative">
        <Input
            id="sidebar-search-input"
            type="text"
            placeholder="Search notes... (Ctrl+/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<SearchIcon className="h-5 w-5" />}
            onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const firstNote = document.querySelector('.note-list-item') as HTMLElement;
                    if (firstNote) {
                        firstNote.focus();
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchTerm('');
                    (e.target as HTMLInputElement).blur();
                }
            }}
            className="w-full"
            autoComplete="off"
        />
        {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center h-full top-0">
                <IconButton
                    onClick={() => setSearchTerm('')}
                    title="Clear search"
                    icon={XCircleIcon}
                    size="sm"
                    variant="ghost"
                />
            </div>
        )}
    </div>
  );
};
