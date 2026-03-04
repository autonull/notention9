import React, {useMemo} from 'react';
import {CheckCircleIcon, ClockIcon, LightBulbIcon, NoteIcon, UserGroupIcon, TagIcon} from '../common/icons';
import {useSettings} from '../../hooks/useSettingsContext';

interface FilterBarProps {
    searchTerm: string;
    onSetSearch: (term: string) => void;
}

// Fallback filters if ontology is empty or not matching well
const DEFAULT_FILTERS = [
    {id: 'tasks', label: 'Tasks', icon: CheckCircleIcon, query: '[status:is:todo]'},
    {id: 'journal', label: 'Journal', icon: NoteIcon, query: '[type:is:journal]'},
    {id: 'ideas', label: 'Ideas', icon: LightBulbIcon, query: '[type:is:idea]'},
    {id: 'people', label: 'People', icon: UserGroupIcon, query: '[type:is:person]'},
];

export function FilterBar({searchTerm, onSetSearch}: FilterBarProps) {
    const {settings} = useSettings();

    // Dynamically build filters based on ontology top-level items if available
    const filters = useMemo(() => {
        if (!settings.ontology || settings.ontology.length === 0) {
            return DEFAULT_FILTERS;
        }

        // Use ontology nodes as filters, creating semantic queries
        const ontologyFilters = settings.ontology.map(node => {
            // Find a suitable icon based on the label, or default to Tag
            let icon = TagIcon;
            const lowerLabel = node.label.toLowerCase();
            if (lowerLabel.includes('task') || lowerLabel.includes('todo')) icon = CheckCircleIcon;
            else if (lowerLabel.includes('journal') || lowerLabel.includes('note')) icon = NoteIcon;
            else if (lowerLabel.includes('idea')) icon = LightBulbIcon;
            else if (lowerLabel.includes('person') || lowerLabel.includes('user')) icon = UserGroupIcon;

            return {
                id: node.id,
                label: node.label,
                icon,
                // Create a query that checks for the existence of properties related to this node
                // Here we simplify by searching for any property key matching the node id/label,
                // but a simpler text query might just be the label for now
                query: `[type:is:${node.label.toLowerCase()}]`
            };
        });

        // Merge with defaults if they don't overlap, or just replace
        return ontologyFilters.length > 0 ? ontologyFilters : DEFAULT_FILTERS;

    }, [settings.ontology]);

    const activeFilterId = filters.find(f => f.query === searchTerm)?.id;

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

            {filters.map(filter => {
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
