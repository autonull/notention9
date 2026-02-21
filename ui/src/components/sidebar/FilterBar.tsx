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
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0 border select-none cursor-pointer
        ${isActive
        ? (isAll
            ? 'bg-gray-700 text-white border-gray-600 shadow-sm'
            : 'bg-blue-900/30 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-900/20')
        : 'bg-gray-800/30 text-gray-400 border-transparent hover:bg-gray-800 hover:text-gray-200 hover:border-gray-700/50'}
    `;

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
            <button
                onClick={() => onSetSearch('')}
                className={getButtonClass(!searchTerm, true)}
                title="All Notes"
            >
                <ClockIcon className={`w-3.5 h-3.5 ${!searchTerm ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`}/>
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
                        <filter.icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}/>
                        {filter.label}
                    </button>
                );
            })}
        </div>
    );
}
