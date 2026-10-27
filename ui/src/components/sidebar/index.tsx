import React, {useRef, useEffect, useCallback, useMemo, useState} from 'react';
import type {Note} from '@notention/core';
import {ConfirmationModal} from '../ui/Primitives';
import {SidebarHeader} from './SidebarHeader';
import {SidebarList} from './SidebarList';
import {SidebarPullToRefresh} from './SidebarPullToRefresh';
import {NoteListItem} from './NoteListItem';
import {NoteGridItem} from './NoteGridItem';
import {IconButton} from '../ui/Button';
import {cn} from '../../utils/ui';
import {VirtualizedList} from '../ui/VirtualizedList';
import {useTouchGestures} from '../../hooks/useTouchGestures';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {SidebarSkeleton} from '../ui/Skeleton';
import {EmptyStatePreset} from '../ui/Primitives';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {modShortcut} from '../../utils/platform';
import {ITEM_HEIGHT, SIDEBAR_COLLAPSED_WIDTH} from '../../constants/ui';
import {NotesEmptyIllustration, EmptyState} from '../ui/Primitives';
import {PlusIcon, ChevronLeftIcon, ChevronRightIcon} from '../ui/icons';
import {SidebarProvider, useSidebar} from './SidebarContext';
import {DeleteConfirmationModal} from './DeleteConfirmationModal';

interface SidebarProps {
    sortedNotes?: Note[];
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
    isLoading?: boolean;
    sidebarWidth?: number;
    isCollapsed?: boolean;
}

function SidebarContent({ onToggleSidebar, isSidebarOpen, sidebarWidth, isCollapsed }: SidebarProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const virtualListRef = useRef<{scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void; scrollToTop: () => void; scrollToBottom: () => void; focusIndex: (index: number) => void}>(null);
    const touchElementRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();
    const sidebar = useSidebar();

    const { isPulling, pullDistance, pullProgress } = useTouchGestures({
        onPullToRefresh: async () => {
            sidebar.refreshUserLocation();
        },
        onSwipeLeft: () => {
            if (isMobile && isSidebarOpen && onToggleSidebar) {
                onToggleSidebar();
            }
        },
        disabled: !isMobile,
    });

    const touchRef = useCallback((el: HTMLDivElement | null) => {
        touchElementRef.current = el;
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            searchInputRef.current?.blur();
        }
    }, []);

    const focusSearch = useCallback(() => {
        searchInputRef.current?.focus();
    }, []);

    return (
        <div className={cn('bg-gray-900 flex flex-col h-full transition-all duration-300 ease-in-out')}>
            <SidebarHeader
                searchInputRef={searchInputRef}
                focusSearch={focusSearch}
                onToggleSidebar={onToggleSidebar}
                isCollapsed={isCollapsed}
                showFullContent={sidebar.showFullContent}
            />
            <SidebarList
                ref={touchRef}
                virtualListRef={virtualListRef}
            />
            <SidebarPullToRefresh
                isMobile={isMobile}
                isPulling={isPulling}
                pullDistance={pullDistance}
                pullProgress={pullProgress}
            />
            <DeleteConfirmationModal />
        </div>
    );
}

export function Sidebar({sortedNotes = [], onToggleSidebar, isSidebarOpen = true, isLoading = false, sidebarWidth = 320, isCollapsed = false}: SidebarProps) {
    if (isLoading) {
        return <SidebarSkeleton/>;
    }

    return (
        <SidebarProvider
            sortedNotes={sortedNotes}
            isLoading={isLoading}
            sidebarWidth={sidebarWidth}
            isCollapsed={isCollapsed}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={onToggleSidebar}
        >
            <SidebarContent
                onToggleSidebar={onToggleSidebar}
                isSidebarOpen={isSidebarOpen}
                sidebarWidth={sidebarWidth}
                isCollapsed={isCollapsed}
            />
        </SidebarProvider>
    );
}