import { useViewNavigation } from '../components/contexts/ViewNavigationContext';
import { useViewSelection } from '../components/contexts/ViewSelectionContext';
import { useViewNotification } from '../components/contexts/ViewNotificationContext';
import { useViewUIState } from '../components/contexts/ViewUIStateContext';
import { useViewLocation } from '../components/contexts/ViewLocationContext';

/**
 * Combined view hook that provides access to all view-related contexts.
 * Uses split contexts internally for better performance (prevents unnecessary re-renders).
 */
export function useView() {
    const navigation = useViewNavigation();
    const selection = useViewSelection();
    const notification = useViewNotification();
    const uiState = useViewUIState();
    const location = useViewLocation();

    return {
        // Navigation
        activeView: navigation.activeView,
        setActiveView: navigation.setActiveView,
        sidebarViewMode: navigation.sidebarViewMode,
        setSidebarViewMode: navigation.setSidebarViewMode,
        isSidebarOpen: navigation.isSidebarOpen,
        setIsSidebarOpen: navigation.setIsSidebarOpen,
        searchTerm: navigation.searchTerm,
        setSearchTerm: navigation.setSearchTerm,
        sortOrder: navigation.sortOrder,
        setSortOrder: navigation.setSortOrder,

        // Selection
        selectedNoteId: selection.selectedNoteId,
        setSelectedNoteId: selection.setSelectedNoteId,
        matchingNoteId: selection.matchingNoteId,
        setMatchingNoteId: selection.setMatchingNoteId,
        selectedChatPubkey: selection.selectedChatPubkey,
        setSelectedChatPubkey: selection.setSelectedChatPubkey,

        // Notifications
        matches: notification.matches,
        addMatch: notification.addMatch,
        clearNotifications: notification.clearNotifications,
        notificationCount: notification.notificationCount,
        chatNotificationCount: notification.chatNotificationCount,
        incrementChatNotification: notification.incrementChatNotification,
        resetChatNotification: notification.resetChatNotification,

        // UI State
        isPaletteOpen: uiState.isPaletteOpen,
        setIsPaletteOpen: uiState.setIsPaletteOpen,
        isHelpOpen: uiState.isHelpOpen,
        setIsHelpOpen: uiState.setIsHelpOpen,

        // Location
        userLocation: location.userLocation,
        refreshUserLocation: location.refreshUserLocation
    };
}

// Also export individual hooks for components that only need a subset
export { useViewNavigation, useViewSelection, useViewNotification, useViewUIState, useViewLocation };