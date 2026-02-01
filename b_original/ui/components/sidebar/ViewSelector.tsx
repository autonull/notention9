import React from 'react';
import type { SidebarViewMode } from '@notention/core';
import { ListUlIcon, CubeIcon, TagIcon } from '../common/icons';
import { IconButton } from '../common/IconButton';

interface ViewSelectorProps {
  viewMode: SidebarViewMode;
  onViewChange: (mode: SidebarViewMode) => void;
}

export function ViewSelector({ viewMode, onViewChange }: ViewSelectorProps) {
  const options: { mode: SidebarViewMode; icon: React.FC<any>; label: string }[] = [
    { mode: 'list', icon: ListUlIcon, label: 'List' },
    { mode: 'grid', icon: CubeIcon, label: 'Grid' },
    { mode: 'cloud', icon: TagIcon, label: 'Tag Cloud' },
  ];

  return (
    <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
      {options.map((option) => (
        <IconButton
          key={option.mode}
          onClick={() => onViewChange(option.mode)}
          icon={option.icon}
          isActive={viewMode === option.mode}
          tooltip={`View as ${option.label}`}
          variant="ghost"
          className="flex-1"
        />
      ))}
    </div>
  );
};
