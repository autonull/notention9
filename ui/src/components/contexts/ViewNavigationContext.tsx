import React, { createContext, ReactNode, useState } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';
import type { SidebarViewMode, SortOrder, View } from '@notention/core';
import { STORAGE_KEYS } from '../../config/storageKeys';

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
}

const ViewNavigationContext = createContext<ViewNavigationContextType | undefined>(undefined);

export function ViewNavigationProvider({ children }: { children: ReactNode }) {
    const [sortOrder, setSortOrder] = useLocalForage<SortOrder>(STORAGE_KEYS.sortOrder, 'updatedAt_desc');
    const [sidebarViewMode, setSidebarViewMode] = useLocalForage<SidebarViewMode>(STORAGE_KEYS.sidebarViewMode, 'list');

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState<View>('notes');
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
                setSortOrder
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