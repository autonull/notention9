import React, {useCallback} from 'react';
import type {Note} from '@notention/core';
import {Search} from './Search';
import {FilterBar} from './FilterBar';
import {SortSelector} from './SortSelector';
import {ViewSelector} from './ViewSelector';
import {IconButton, Button} from '../ui/Primitives';
import {PlusIcon, ChevronLeftIcon, ChevronRightIcon} from '../common/icons';
import {cn} from '../../utils/ui';
import {modShortcut} from '../../utils/platform';
import {SIDEBAR_COLLAPSED_WIDTH} from '../../constants/ui';

interface SidebarHeaderProps {
    searchInputRef: React.RefObject<HTMLInputElement>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    focusSearch: () => void;
    onToggleSidebar: (() => void) | undefined;
    handleCreateNote: () => void;
    isCollapsed: boolean;
    showFullContent: boolean;
    sidebarViewMode: string;
    setSidebarViewMode: (mode: string) => void;
    sortOrder: string;
    setSortOrder: (order: string) => void;
    sortedNotes: Note[];
    showPinnedOnly: boolean;
    setShowPinnedOnly: (show: boolean) => void;
}

export function SidebarHeader({
    searchInputRef,
    searchTerm,
    setSearchTerm,
    focusSearch,
    onToggleSidebar,
    handleCreateNote,
    isCollapsed,
    showFullContent,
    sidebarViewMode,
    setSidebarViewMode,
    sortOrder,
    setSortOrder,
    sortedNotes,
    showPinnedOnly,
    setShowPinnedOnly
}: SidebarHeaderProps) {
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            searchInputRef.current?.blur();
            setSearchTerm('');
        }
    }, [searchInputRef, setSearchTerm]);

    return (
        <div className={cn(
            'flex-shrink-0 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10 transition-all duration-200',
            showFullContent ? 'p-3 space-y-3' : 'p-2 space-y-2 items-center'
        )}>
            <div className={cn('flex items-center gap-2 w-full', showFullContent ? '' : 'justify-center')}>
                <div className={cn('flex-grow relative group transition-all duration-200', !showFullContent && 'w-10')}>
                    <Search
                        ref={searchInputRef}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        onFocus={focusSearch}
                        placeholder={showFullContent ? 'Search notes...' : ''}
                        aria-label="Search notes"
                    />
                </div>
                {!showFullContent && onToggleSidebar && (
                    <IconButton
                        onClick={onToggleSidebar}
                        tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        tooltipPosition="right"
                        icon={isCollapsed ? ChevronRightIcon : ChevronLeftIcon}
                        variant="ghost"
                        size="md"
                        className="flex-shrink-0 touch-target-48"
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    />
                )}
                {showFullContent && (
                    <Button
                        onClick={handleCreateNote}
                        tooltip={`New Note (${modShortcut('N')})`}
                        tooltipPosition="bottom"
                        leftIcon={<PlusIcon className="w-5 h-5"/>}
                        variant="primary"
                        size="md"
                        className="flex-shrink-0 shadow-lg shadow-blue-500/20 touch-target-48"
                        aria-label="Create new note"
                    >
                        New Note
                    </Button>
                )}
            </div>

            {showFullContent && (
                <>
                    <div className="flex items-center gap-2 overflow-hidden" role="group" aria-label="View and filter options">
                        <div className="flex-grow min-w-0">
                            <FilterBar searchTerm={searchTerm} onSetSearch={setSearchTerm} notes={sortedNotes}/>
                        </div>
                        <div className="flex items-center gap-1 border-l border-gray-700/50 pl-2">
                            <ViewSelector viewMode={sidebarViewMode} onViewChange={setSidebarViewMode}/>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-1" role="group" aria-label="Sort and filter options">
                        <SortSelector sortOrder={sortOrder} onSortChange={setSortOrder}/>
                        {sortedNotes.some(n => n.pinned) && (
                            <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer touch-target-48">
                                <input
                                    type="checkbox"
                                    checked={showPinnedOnly}
                                    onChange={(e) => setShowPinnedOnly(e.target.checked)}
                                    className="w-4 h-4 accent-blue-500 rounded border-gray-700 bg-gray-800 focus:ring-2 focus:ring-blue-500"
                                    aria-label="Show pinned only"
                                />
                                <span className="hidden sm:inline">Pinned only</span>
                                <span className="sm:hidden" aria-hidden="true">📌</span>
                            </label>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}