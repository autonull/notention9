import React from 'react';
import type {SortOrder} from '@notention/core';
import {IconButton} from '../common/IconButton';
import {ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, CalendarIcon, MapPinIcon, TagIcon} from '../common/icons';

const SORT_OPTIONS: {value: SortOrder; label: string; icon: React.FC<any>; description: string}[] = [
    {value: "updatedAt_desc", label: "Modified (Newest)", icon: ArrowDownIcon, description: "Recently updated first"},
    {value: "updatedAt_asc", label: "Modified (Oldest)", icon: ArrowUpIcon, description: "Least recently updated first"},
    {value: "createdAt_desc", label: "Created (Newest)", icon: CalendarIcon, description: "Recently created first"},
    {value: "createdAt_asc", label: "Created (Oldest)", icon: CalendarIcon, description: "Least recently created first"},
    {value: "title_asc", label: "Title (A-Z)", icon: TagIcon, description: "Alphabetical ascending"},
    {value: "title_desc", label: "Title (Z-A)", icon: TagIcon, description: "Alphabetical descending"},
    {value: "soonest", label: "Soonest (Date)", icon: ClockIcon, description: "Earliest due date first"},
    {value: "nearest", label: "Nearest (Location)", icon: MapPinIcon, description: "Closest by location"},
    {value: "tags", label: "Tags (Count)", icon: TagIcon, description: "Most tags first"},
];

import {ClockIcon} from '../common/icons';

interface SortSelectorProps {
    sortOrder: SortOrder;
    onSortChange: (order: SortOrder) => void;
}

export function SortSelector({sortOrder, onSortChange}: SortSelectorProps) {
    const activeOption = SORT_OPTIONS.find(opt => opt.value === sortOrder);

    return (
        <div className="relative" role="combobox" aria-label="Sort order" aria-expanded="false" aria-controls="sort-options">
            <IconButton
                variant="ghost"
                size="sm"
                icon={ArrowUpDownIcon}
                tooltip={`Sort: ${activeOption?.label}`}
                tooltipPosition="bottom"
                onClick={(e) => {
                    e.preventDefault();
                    e.currentTarget.focus();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const select = document.getElementById('sort-select') as HTMLSelectElement;
                        select?.focus();
                    }
                }}
                aria-haspopup="listbox"
            />
            <select
                id="sort-select"
                value={sortOrder}
                onChange={(e) => onSortChange(e.target.value as SortOrder)}
                onBlur={(e) => {
                    const select = e.currentTarget;
                    select.style.opacity = '0';
                    select.style.pointerEvents = 'none';
                }}
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full cursor-pointer"
                aria-label="Sort order"
            >
                {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}