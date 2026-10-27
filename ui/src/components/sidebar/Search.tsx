import React, {forwardRef} from 'react';
import {SearchIcon, XCircleIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';

interface SearchProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onFocus?: () => void;
    placeholder?: string;
    'aria-label'?: string;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(({
    searchTerm,
    setSearchTerm,
    onFocus,
    placeholder = 'Search notes... (Ctrl+/)',
    'aria-label': ariaLabel = 'Search notes',
}, ref) => {
    return (
        <div className="relative">
            <Input
                ref={ref}
                id="sidebar-search-input"
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={onFocus}
                leftIcon={<SearchIcon className="h-5 w-5"/>}
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
                aria-label={ariaLabel}
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
});

Search.displayName = 'Search';