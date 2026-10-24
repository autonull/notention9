import React, {useMemo} from 'react';
import {CheckCircleIcon, ClockIcon, LightBulbIcon, NoteIcon, UserGroupIcon, TrashIcon, PlusIcon, TagIcon} from '../common/icons';
import type {Note} from '@notention/core';
import {cn} from '../../utils/ui';

interface FilterBarProps {
    searchTerm: string;
    onSetSearch: (term: string) => void;
    notes?: Note[];
}

const BASE_FILTERS = [
    {id: 'tasks', label: 'Tasks', icon: CheckCircleIcon, query: 'status:todo'},
    {id: 'journal', label: 'Journal', icon: NoteIcon, query: 'type:journal'},
    {id: 'ideas', label: 'Ideas', icon: LightBulbIcon, query: 'type:idea'},
    {id: 'people', label: 'People', icon: UserGroupIcon, query: 'type:person'},
] as const;

function getDynamicFilters(notes: Note[] = []): {id: string; label: string; icon: React.FC<any>; query: string}[] {
    if (!notes.length) return [];

    const typeCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const note of notes) {
        const type = note.properties?.find(p => p.key === 'type')?.values?.[0];
        if (type) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

        const status = note.properties?.find(p => p.key === 'status')?.values?.[0];
        if (status) statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

        for (const tag of note.tags || []) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
    }

    const dynamicFilters: {id: string; label: string; icon: React.FC<any>; query: string}[] = [];

    // Add type-based filters that have notes
    for (const [type, count] of typeCounts.entries()) {
        const existing = BASE_FILTERS.find(f => f.query === `type:${type}`);
        if (!existing && count > 0) {
            const icon = type === 'request' ? DownloadIcon : type === 'offer' ? PlusIcon : TagIcon;
            dynamicFilters.push({id: `type-${type}`, label: `${type} (${count})`, icon, query: `type:${type}`});
        }
    }

    // Add status-based filters that have notes
    for (const [status, count] of statusCounts.entries()) {
        const existing = BASE_FILTERS.find(f => f.query === `status:${status}`);
        if (!existing && count > 0) {
            dynamicFilters.push({id: `status-${status}`, label: `${status} (${count})`, icon: ClockIcon, query: `status:${status}`});
        }
    }

    // Add top 3 tag filters
    const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    for (const [tag, count] of sortedTags) {
        dynamicFilters.push({id: `tag-${tag}`, label: `#${tag} (${count})`, icon: TagIcon, query: `#${tag}`});
    }

    return dynamicFilters;
}

export function FilterBar({searchTerm, onSetSearch, notes = []}: FilterBarProps) {
    const dynamicFilters = useMemo(() => getDynamicFilters(notes), [notes]);
    const allFilters = [...BASE_FILTERS, ...dynamicFilters];

    const activeFilterId = allFilters.find(f => f.query === searchTerm)?.id;

    const handleFilterClick = (query: string, id: string) => {
        onSetSearch(activeFilterId === id ? '' : query);
    };

    const handleKeyDown = (e: React.KeyboardEvent, query: string, id: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFilterClick(query, id);
        }
    };

    const getButtonClass = (isActive: boolean, isAll = false) => cn(
        'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold transition-all duration-200 flex-shrink-0 select-none cursor-pointer',
        isActive
            ? (isAll
                ? 'bg-gray-700 text-white shadow-sm'
                : 'bg-blue-900/40 text-blue-400 shadow-sm shadow-blue-900/20')
            : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800/50'
    );

    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Quick filters">
            <button
                onClick={() => onSetSearch('')}
                onKeyDown={(e) => handleKeyDown(e, '', 'all')}
                className={getButtonClass(!searchTerm, true)}
                title="All Notes"
                role="tab"
                aria-selected={!searchTerm}
                aria-controls="sidebar-note-list"
            >
                All
            </button>

            {allFilters.map(filter => {
                const isActive = activeFilterId === filter.id;
                return (
                    <button
                        key={filter.id}
                        onClick={() => handleFilterClick(filter.query, filter.id)}
                        onKeyDown={(e) => handleKeyDown(e, filter.query, filter.id)}
                        className={getButtonClass(isActive)}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls="sidebar-note-list"
                    >
                        {filter.label}
                    </button>
                );
            })}
        </div>
    );
}