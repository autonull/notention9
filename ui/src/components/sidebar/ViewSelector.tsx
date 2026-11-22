import React from 'react';
import type {SidebarViewMode} from '@notention/core';
import {GridIcon, ListIcon} from '../ui/icons';
import {cn} from '../../utils/ui';

interface ViewSelectorProps {
    viewMode: SidebarViewMode;
    onViewChange: (mode: SidebarViewMode) => void;
}

export function ViewSelector({viewMode, onViewChange}: ViewSelectorProps) {
    const options: { mode: SidebarViewMode; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }[] = [
        {mode: 'list', icon: ListIcon, label: 'List view'},
        {mode: 'grid', icon: GridIcon, label: 'Grid view'},
    ];

    return (
        <div className="flex items-center gap-0.5" role="group" aria-label="Sidebar view mode">
            {options.map((option) => {
                const Icon = option.icon;
                const isActive = viewMode === option.mode;
                return (
                    <button
                        key={option.mode}
                        type="button"
                        onClick={() => onViewChange(option.mode)}
                        aria-pressed={isActive}
                        aria-label={option.label}
                        title={option.label}
                        className={cn(
                            'flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                            isActive
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/60'
                        )}
                    >
                        <Icon className="w-4 h-4"/>
                    </button>
                );
            })}
        </div>
    );
}