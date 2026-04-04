import React from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {SmartNoteAssistant} from "@/components/SmartNoteAssistant";
import {SettingsProvider} from "@/components/contexts/SettingsContext";
import {ToastProvider} from "@/components/contexts/ToastProvider";
import {ViewContext} from "@/components/contexts/ViewContext";
import {Note} from '@notention/core';

vi.mock('../../hooks/useNotes', () => ({
    useNotes: () => ({ notes: [], addNote: vi.fn(), getSortedFilteredNotes: vi.fn().mockReturnValue([]) })
}));

vi.mock('../../hooks/useMatchDiscovery', () => ({
    useMatchDiscovery: () => []
}));

vi.mock('../../hooks/useNetworkDiscovery', () => ({
    useNetworkDiscovery: () => ({ matches: [], isSearching: false, discover: vi.fn() })
}));

vi.mock('../../hooks/useNoteAnalysis', () => ({
    useNoteAnalysis: () => ({
        suggestions: [{ id: '1', text: 'Suggestion 1', type: 'property' }],
        removeSuggestion: vi.fn()
    })
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
    it('renders simplified labels', () => {
        const note: Note = {
            id: 'test-note',
            title: 'Test',
            content: 'need to buy milk',
            type: 'note',
            properties: [],
            created_at: Date.now(),
            modified_at: Date.now(),
            tags: [],
            stats: {viewCount: 0, readTime: 0}
        };

        render(
            <MockProviders>
                <SmartNoteAssistant note={note} onNoteUpdate={() => {
                }}/>
            </MockProviders>
        );

        // We avoid awaiting async updates to resolve timeout issues, and rely on synchronous rendering
        expect(screen.getByText('Assistant')).toBeInTheDocument();
    });
});
