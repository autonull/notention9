import React from 'react';
import type {SidebarViewMode} from '@notention/core';
import {GridIcon, ListIcon, TagIcon} from '../common/icons';
import {IconButton} from '../ui/Primitives';

interface ViewSelectorProps {
    viewMode: SidebarViewMode;
    onViewChange: (mode: SidebarViewMode) => void;
}

export function ViewSelector({viewMode, onViewChange}: ViewSelectorProps) {
    const options: { mode: SidebarViewMode; icon: React.FC<any>; label: string }[] = [
        {mode: 'list', icon: ListIcon, label: 'List View'},
        {mode: 'grid', icon: GridIcon, label: 'Grid View'},
        {mode: 'cloud', icon: TagIcon, label: 'Tag Cloud'},
    ];

    return (
        <div className="flex items-center gap-0.5" role="group" aria-label="Sidebar view mode">
            {options.map((option) => (
                <IconButton
                    key={option.mode}
                    onClick={() => onViewChange(option.mode)}
                    icon={option.icon}
                    isActive={viewMode === option.mode}
                    tooltip={`View as ${option.label}`}
                    variant="ghost"
                    size="sm"
                    aria-pressed={viewMode === option.mode}
                />
            ))}
        </div>
    );
}