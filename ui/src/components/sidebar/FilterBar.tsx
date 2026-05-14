import React from 'react';
import {CheckCircleIcon, ClockIcon, LightBulbIcon, NoteIcon, UserGroupIcon} from '../common/icons';

interface FilterBarProps {
    searchTerm: string;
    onSetSearch: (term: string) => void;
}

const FILTERS = [
    {id: 'tasks', label: 'Tasks', icon: CheckCircleIcon, query: '[status:is:todo]'},
    {id: 'journal', label: 'Journal', icon: NoteIcon, query: '[type:is:journal]'},
    {id: 'ideas', label: 'Ideas', icon: LightBulbIcon, query: '[type:is:idea]'},
    {id: 'people', label: 'People', icon: UserGroupIcon, query: '[type:is:person]'},
] as const;

export function FilterBar({searchTerm, onSetSearch}: FilterBarProps) {
    const activeFilterId = FILTERS.find(f => f.query === searchTerm)?.id;

    const handleFilterClick = (query: string, id: string) => {
        onSetSearch(activeFilterId === id ? '' : query);
    };

    const getButtonClass = (isActive: boolean, isAll = false) => `
        flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold transition-all duration-200 flex-shrink-0 select-none cursor-pointer
        ${isActive
        ? (isAll
            ? 'bg-gray-700 text-white shadow-sm'
            : 'bg-blue-900/40 text-blue-400 shadow-sm shadow-blue-900/20')
        : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800/50'}
    `;

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
                onClick={() => onSetSearch('')}
                className={getButtonClass(!searchTerm, true)}
                title="All Notes"
            >
                All
            </button>

            {FILTERS.map(filter => {
                const isActive = activeFilterId === filter.id;
                return (
                    <button
                        key={filter.id}
                        onClick={() => handleFilterClick(filter.query, filter.id)}
                        className={getButtonClass(isActive)}
                    >
                        {filter.label}
                    </button>
                );
            })}
        </div>
    );
}
