import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { SettingsContext } from '../../components/contexts/SettingsContext';
import { ViewNavigationContext } from '../../components/contexts/ViewNavigationContext';
import { ViewSelectionContext } from '../../components/contexts/ViewSelectionContext';
import { ViewNotificationContext } from '../../components/contexts/ViewNotificationContext';
import { ViewUIStateContext } from '../../components/contexts/ViewUIStateContext';
import { ViewLocationContext } from '../../components/contexts/ViewLocationContext';
import { ToastContext } from '../../components/contexts/ToastContext';

interface TestProvidersProps {
    children: ReactNode;
    settings?: any;
    viewNavigation?: any;
    viewSelection?: any;
    viewNotification?: any;
    viewUIState?: any;
    viewLocation?: any;
    toast?: any;
}

export const TestProviders = ({
    children,
    settings = {
        settings: { aiEnabled: false, developerMode: true, theme: 'dark', nostr: { privkey: null }, ontology: [], customTemplates: [] },
        setSettings: vi.fn(),
        settingsLoading: false
    },
    viewNavigation = {
        activeView: 'notes',
        setActiveView: vi.fn(),
        sidebarViewMode: 'list',
        setSidebarViewMode: vi.fn(),
        isSidebarOpen: true,
        setIsSidebarOpen: vi.fn(),
        searchTerm: '',
        setSearchTerm: vi.fn(),
        sortOrder: 'updatedAt_desc',
        setSortOrder: vi.fn()
    },
    viewSelection = {
        selectedNoteId: null,
        setSelectedNoteId: vi.fn(),
        matchingNoteId: null,
        setMatchingNoteId: vi.fn(),
        selectedChatPubkey: null,
        setSelectedChatPubkey: vi.fn()
    },
    viewNotification = {
        matches: [],
        addMatch: vi.fn(),
        clearNotifications: vi.fn(),
        notificationCount: 0,
        chatNotificationCount: 0,
        incrementChatNotification: vi.fn(),
        resetChatNotification: vi.fn()
    },
    viewUIState = {
        isPaletteOpen: false,
        setIsPaletteOpen: vi.fn(),
        isHelpOpen: false,
        setIsHelpOpen: vi.fn()
    },
    viewLocation = {
        userLocation: null,
        refreshUserLocation: vi.fn()
    },
    toast = {
        toasts: [],
        addToast: vi.fn(),
        removeToast: vi.fn()
    }
}: TestProvidersProps) => {
    return (
        <SettingsContext.Provider value={settings}>
            <ViewNavigationContext.Provider value={viewNavigation}>
                <ViewSelectionContext.Provider value={viewSelection}>
                    <ViewNotificationContext.Provider value={viewNotification}>
                        <ViewUIStateContext.Provider value={viewUIState}>
                            <ViewLocationContext.Provider value={viewLocation}>
                                <ToastContext.Provider value={toast}>
                                    {children}
                                </ToastContext.Provider>
                            </ViewLocationContext.Provider>
                        </ViewUIStateContext.Provider>
                    </ViewNotificationContext.Provider>
                </ViewSelectionContext.Provider>
            </ViewNavigationContext.Provider>
        </SettingsContext.Provider>
    );
};

export const renderWithProviders = (ui: React.ReactElement, options?: TestProvidersProps) => {
    return render(<TestProviders {...options}>{ui}</TestProviders>);
};