import React from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {SmartNoteAssistant} from "../../components/SmartNoteAssistant";
import {SettingsProvider} from "../../components/contexts/SettingsContext";
import {ToastProvider} from "../../components/contexts/ToastProvider";
import {ViewContext} from "../../components/contexts/ViewContext";
import {createNote} from '@notention/core';

vi.mock('../../hooks/useNotes', () => ({
    useNotes: () => ({ notes: [], addNote: vi.fn(), getSortedFilteredNotes: vi.fn().mockReturnValue([]) })
}));

vi.mock('../../hooks/useMatches', () => ({
    useMatches: () => []
}));

vi.mock('../../hooks/useNetworkDiscovery', () => ({
    useNetworkDiscovery: () => ({ matches: [], isSearching: false, discover: vi.fn(), clear: vi.fn() })
}));

vi.mock('../../hooks/useNoteAnalysis', () => ({
    useNoteAnalysis: () => ({
        suggestions: [{ id: '1', text: 'Suggestion 1', type: 'property' }],
        removeSuggestion: vi.fn()
    })
}));

vi.mock('../../hooks/useContacts', () => ({
    useContacts: () => ({ contacts: [] })
}));

const mockViewContext = {
    activeView: 'notes',
    setActiveView: () => {},
    selectedNoteId: null,
    setSelectedNoteId: () => {},
    matchingNoteId: null,
    setMatchingNoteId: () => {},
    selectedChatPubkey: null,
    setSelectedChatPubkey: () => {},
    showToast: () => {},
    notificationCount: 0,
    matches: [],
    addMatch: () => {},
    clearNotifications: () => {},
    searchTerm: '',
    setSearchTerm: () => {},
    sortOrder: 'updatedAt_desc',
    setSortOrder: () => {},
    isSidebarOpen: true,
    setIsSidebarOpen: () => {},
    chatNotificationCount: 0,
    incrementChatNotification: () => {},
    resetChatNotification: () => {},
    isPaletteOpen: false,
    setIsPaletteOpen: () => {},
    isHelpOpen: false,
    setIsHelpOpen: () => {},
    userLocation: null,
    refreshUserLocation: async () => {},
    sidebarViewMode: 'list',
    setSidebarViewMode: () => {}
};

// Mock contexts
const MockProviders = ({children}: { children: React.ReactNode }) => (
    <ViewContext.Provider value={mockViewContext as any}>
        <SettingsProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </SettingsProvider>
    </ViewContext.Provider>
);

describe('SmartNoteAssistant', () => {
    it('renders simplified labels', async () => {
        const note = createNote({
            id: 'test-note',
            title: 'Test',
            content: 'need to buy milk'
        });

        render(
            <MockProviders>
                <SmartNoteAssistant note={note} onNoteUpdate={() => {
                }}/>
            </MockProviders>
        );

        // Wait for async analysis (debounce is 1000ms, so we need >1000ms timeout)
        await expect(screen.findByText('Suggestion 1', {}, {timeout: 3000})).resolves.toBeInTheDocument();

        // Check for the Assistant header
        expect(screen.getByText('Assistant')).toBeInTheDocument();
    });
});
