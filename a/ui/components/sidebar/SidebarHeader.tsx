import React from 'react';
import type { SortOrder, SidebarViewMode } from '@notention/core';
import { Search } from './Search';
import { SortSelector } from './SortSelector';
import { ViewSelector } from './ViewSelector';
import { IconButton } from '../common/IconButton';
import { PlusIcon } from '../common/icons';

interface SidebarHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  viewMode: SidebarViewMode;
  onViewChange: (mode: SidebarViewMode) => void;
  onCreateNote: () => void;
}

export function SidebarHeader({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder,
  viewMode,
  onViewChange,
  onCreateNote
}: SidebarHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-700/50 p-3 space-y-3 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
          <div className="flex-grow">
              <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>
          <IconButton
              onClick={onCreateNote}
              tooltip="New Note (Ctrl+N)"
              tooltipPosition="bottom"
              icon={PlusIcon}
              variant="primary"
              size="lg"
              containerClassName="flex-shrink-0"
              className="shadow-lg shadow-blue-900/20"
          />
      </div>

      <div className="flex gap-2 items-center">
          <div className="flex-grow min-w-0">
              <SortSelector sortOrder={sortOrder} onSortChange={setSortOrder} />
          </div>
          <ViewSelector viewMode={viewMode} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
