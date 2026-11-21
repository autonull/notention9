import React, { createContext, ReactNode, useState } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';
import type { SidebarViewMode, SortOrder, View } from '@notention/core';
import { STORAGE_KEYS } from '../../config/storageKeys';

export type NotesSection = 'all' | 'tasks' | 'tags' | 'trash';
export type NotesMode = 'list' | 'board' | 'map' | 'timeline';

export interface ViewNavigationContextType {
    activeView: View;
    setActiveView: (view: View) => void;
    sidebarViewMode: SidebarViewMode;
    setSidebarViewMode: (mode: SidebarViewMode) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    sortOrder: SortOrder;
    setSortOrder: (order: SortOrder) => void;
    notesSection: NotesSection;
    setNotesSection: (section: NotesSection) => void;
    notesMode: NotesMode;
    setNotesMode: (mode: NotesMode) => void;
}

const ViewNavigationContext = createContext<ViewNavigationContextType | undefined>(undefined);

export function ViewNavigationProvider({ children }: { children: ReactNode }) {
    const [sortOrder, setSortOrder] = useLocalForage<SortOrder>(STORAGE_KEYS.sortOrder, 'updatedAt_desc');
    const [sidebarViewMode, setSidebarViewMode] = useLocalForage<SidebarViewMode>(STORAGE_KEYS.sidebarViewMode, 'list');
    const [notesSection, setNotesSection] = useLocalForage<NotesSection>(STORAGE_KEYS.notesSection, 'all');
    const [notesMode, setNotesMode] = useLocalForage<NotesMode>(STORAGE_KEYS.notesMode, 'list');

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState<View>('capture');
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <ViewNavigationContext.Provider
            value={{
                activeView,
                setActiveView,
                sidebarViewMode,
                setSidebarViewMode,
                isSidebarOpen,
                setIsSidebarOpen,
                searchTerm,
                setSearchTerm,
                sortOrder,
                setSortOrder,
                notesSection,
                setNotesSection,
                notesMode,
                setNotesMode
            }}
        >
            {children}
        </ViewNavigationContext.Provider>
    );
}

export { ViewNavigationContext };
export const useViewNavigation = () => {
    const ctx = React.useContext(ViewNavigationContext);
    if (!ctx) throw new Error('useViewNavigation must be used within ViewNavigationProvider');
    return ctx;
};