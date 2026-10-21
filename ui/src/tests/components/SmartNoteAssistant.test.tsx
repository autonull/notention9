import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {SmartNoteAssistant} from "../../components/SmartNoteAssistant";
import {SettingsProvider} from "../../components/contexts/SettingsContext";
import {ToastProvider} from "../../components/contexts/ToastProvider";
import {ViewContext} from "../../components/contexts/ViewContext";
import {createNote} from '@notention/core';

vi.mock('../../hooks/useSmartNoteAssistant', () => ({
    useSmartNoteAssistant: () => ({
        isOpen: true,
        setIsOpen: vi.fn(),
        activeTab: 'suggestions',
        setActiveTab: vi.fn(),
        activeSuggestion: 0,
        setActiveSuggestion: vi.fn(),
        suggestions: [{ id: '1', text: 'Suggestion 1', type: 'property' }],
        removeSuggestion: vi.fn(),
        localMatches: [],
        networkMatches: [],
        isSearching: false,
        discoverMatches: vi.fn(),
        clearNetworkMatches: vi.fn(),
        propertyReview: { items: [], accept: vi.fn(), reject: vi.fn() },
        isAddingProperty: false,
        setIsAddingProperty: vi.fn(),
        editingPropertyIndex: null,
        setEditingPropertyIndex: vi.fn(),
        propertyToDelete: null,
        setPropertyToDelete: vi.fn(),
        attributeModalOpen: false,
        setAttributeModalOpen: vi.fn(),
        aliasModalOpen: false,
        setAliasModalOpen: vi.fn(),
        targetKey: '',
        setTargetKey: vi.fn(),
        inferredType: 'string',
        setInferredType: vi.fn(),
        handleSaveProperty: vi.fn(),
        handleAcceptReview: vi.fn(),
        handleDeleteProperty: vi.fn(),
        handleCancelEdit: vi.fn(),
        handleConnect: vi.fn(),
        handleChat: vi.fn(),
        handleFindMatches: vi.fn(),
        handleApplySuggestion: vi.fn(),
        handleConfirmAddAttribute: vi.fn(),
        handleConfirmAddAlias: vi.fn(),
        handleKeyDown: vi.fn(),
        toggleOpen: vi.fn()
    })
}));

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

vi.mock('../../hooks/useSettingsContext', () => ({
    useSettings: () => ({ settings: { ontology: [] }, setSettings: vi.fn() })
}));

vi.mock('../../hooks/usePropertyReview', () => ({
    usePropertyReview: () => ({ items: [], accept: vi.fn(), reject: vi.fn() })
}));

vi.mock('../../hooks/useViewContext', () => ({
    useView: () => ({
        activeView: 'notes',
        setActiveView: vi.fn(),
        selectedNoteId: null,
        setSelectedNoteId: vi.fn(),
        matchingNoteId: null,
        setMatchingNoteId: vi.fn(),
        selectedChatPubkey: null,
        setSelectedChatPubkey: vi.fn(),
        showToast: vi.fn(),
        notificationCount: 0,
        matches: [],
        addMatch: vi.fn(),
        clearNotifications: vi.fn(),
        searchTerm: '',
        setSearchTerm: vi.fn(),
        sortOrder: 'updatedAt_desc',
        setSortOrder: vi.fn(),
        isSidebarOpen: true,
        setIsSidebarOpen: vi.fn(),
        chatNotificationCount: 0,
        incrementChatNotification: vi.fn(),
        resetChatNotification: vi.fn(),
        isPaletteOpen: false,
        setIsPaletteOpen: vi.fn(),
        isHelpOpen: false,
        setIsHelpOpen: vi.fn(),
        userLocation: null,
        refreshUserLocation: async () => {},
        sidebarViewMode: 'list',
        setSidebarViewMode: vi.fn()
    })
}));

vi.mock('../../hooks/useToast', () => ({
    useToast: () => ({
        addToast: vi.fn()
    })
}));

describe('SmartNoteAssistant', () => {
    it('renders simplified labels', async () => {
        const note = createNote({
            id: 'test-note',
            title: 'Test',
            content: 'need to buy milk'
        });

        render(
            <SmartNoteAssistant note={note} onNoteUpdate={() => {}}/>
        );

        // Wait for async analysis (debounce is 1000ms, so we need >1000ms timeout)
        await expect(screen.findByText('Suggestion 1', {}, {timeout: 3000})).resolves.toBeInTheDocument();

        // Check for the Assistant header
        expect(screen.getByText('Assistant')).toBeInTheDocument();
    });
});
