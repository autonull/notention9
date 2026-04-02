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
        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 border
        ${isActive
        ? (isAll ? 'bg-gray-700 text-white border-gray-600' : 'bg-blue-900/30 text-blue-200 border-blue-700/50')
        : 'bg-transparent text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-300'}
    `;

    return (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar scrollbar-none">
            <button
                onClick={() => onSetSearch('')}
                className={getButtonClass(!searchTerm, true)}
                title="All Notes"
            >
                <ClockIcon className="w-3 h-3"/>
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
                        <filter.icon className={`w-3 h-3 ${isActive ? 'text-blue-400' : ''}`}/>
                        {filter.label}
                    </button>
                );
            })}
        </div>
    );
}
