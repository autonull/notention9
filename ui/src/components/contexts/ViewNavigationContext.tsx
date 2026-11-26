import React, { createContext, ReactNode, useState } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';
import type { NoteMode, NoteTab, NotesGroup, NotesSection, SettingsTab, SidebarViewMode, SortOrder, View } from '@notention/core';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { parseRoute } from '../../utils/navigation';

export type { NoteMode, NoteTab, NotesSection, SettingsTab };

function getInitialView(): View {
    if (typeof window !== 'undefined') {
        try {
            return parseRoute(window.location.hash).view;
        } catch {
            return 'notes';
        }
    }
    return 'notes';
}

function getInitialSettingsTab(): SettingsTab {
    if (typeof window !== 'undefined') {
        try {
            return parseRoute(window.location.hash).settingsTab;
        } catch {
            return 'general';
        }
    }
    return 'general';
}

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
    notesMode: NoteMode;
    setNotesMode: (mode: NoteMode) => void;
    notesGroup: NotesGroup;
    setNotesGroup: (group: NotesGroup) => void;
    historyShare: number;
    setHistoryShare: (share: number) => void;
    contextShare: number;
    setContextShare: (share: number) => void;
    isContextOpen: boolean;
    setIsContextOpen: (isOpen: boolean) => void;
    noteTab: NoteTab;
    setNoteTab: (tab: NoteTab) => void;
    settingsTab: SettingsTab;
    setSettingsTab: (tab: SettingsTab) => void;
    uisgMode: string;
    setUisgMode: (mode: string) => void;
}

const ViewNavigationContext = createContext<ViewNavigationContextType | undefined>(undefined);

export function ViewNavigationProvider({ children }: { children: ReactNode }) {
    const [sortOrder, setSortOrder] = useLocalForage<SortOrder>(STORAGE_KEYS.sortOrder, 'updatedAt_desc');
    const [sidebarViewMode, setSidebarViewMode] = useLocalForage<SidebarViewMode>(STORAGE_KEYS.sidebarViewMode, 'list');
    const [notesSection, setNotesSection] = useLocalForage<NotesSection>(STORAGE_KEYS.notesSection, 'all');
    const [notesMode, setNotesMode] = useLocalForage<NoteMode>(STORAGE_KEYS.notesMode, 'list');
    const [notesGroup, setNotesGroup] = useLocalForage<NotesGroup>(STORAGE_KEYS.notesGroup, 'status');
    const [historyShare, setHistoryShare] = useLocalForage<number>(STORAGE_KEYS.historyShare, 22);
    const [contextShare, setContextShare] = useLocalForage<number>(STORAGE_KEYS.contextShare, 20);
    const [isContextOpen, setIsContextOpen] = useLocalForage<boolean>(STORAGE_KEYS.contextOpen, false);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState<View>(getInitialView);
    const [searchTerm, setSearchTerm] = useState('');
    const [noteTab, setNoteTab] = useState<NoteTab>('next');
    const [settingsTab, setSettingsTab] = useState<SettingsTab>(getInitialSettingsTab);
    const [uisgMode, setUisgMode] = useState<string>('graph');

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
                setNotesMode,
                notesGroup,
                setNotesGroup,
                historyShare,
                setHistoryShare,
                contextShare,
                setContextShare,
                isContextOpen,
                setIsContextOpen,
                noteTab,
                setNoteTab,
                settingsTab,
                setSettingsTab,
                uisgMode,
                setUisgMode,
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
