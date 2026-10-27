import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import App from '../App';
import {NotesProvider} from '../components/contexts/NotesContext';
import {SettingsProvider} from '../components/contexts/SettingsContext';
import {ToastProvider} from '../components/contexts/ToastProvider';
import {ViewProvider} from '../components/contexts/ViewContext';

// Mock the hooks
vi.mock('../hooks/useNotes', () => ({
    useNotes: () => ({
        notes: [],
        addNote: vi.fn(),
        deleteNote: vi.fn(),
        upsertNote: vi.fn(),
        updateNote: vi.fn(),
        restoreNote: vi.fn(),
        permanentlyDeleteNote: vi.fn(),
        notesLoading: false,
        getSortedFilteredNotes: vi.fn(() => []),
    }),
}));

vi.mock('../hooks/useViewContext', () => ({
    useView: () => ({
        activeView: 'notes',
        setActiveView: vi.fn(),
        selectedNoteId: null,
        setSelectedNoteId: vi.fn(),
        searchTerm: '',
        sortOrder: 'updatedAt_desc',
        isSidebarOpen: true,
        setIsSidebarOpen: vi.fn(),
        userLocation: null,
        isPaletteOpen: false,
        setIsPaletteOpen: vi.fn(),
        isHelpOpen: false,
        setIsHelpOpen: vi.fn(),
        sidebarViewMode: 'list',
        setSidebarViewMode: vi.fn(),
        refreshUserLocation: vi.fn(),
        matchingNoteId: null,
        setMatchingNoteId: vi.fn(),
        selectedChatPubkey: null,
        setSelectedChatPubkey: vi.fn(),
        notificationCount: 0,
        matches: [],
        addMatch: vi.fn(),
        clearNotifications: vi.fn(),
        chatNotificationCount: 0,
        incrementChatNotification: vi.fn(),
        resetChatNotification: vi.fn(),
    }),
}));

vi.mock('../hooks/useNetworkManagement', () => ({
    useNetworkManagement: vi.fn(),
}));

// Mock the onboarding service to prevent issues with constructor
vi.mock('@notention/core', async () => {
    const actual = await vi.importActual('@notention/core');
    return {
        ...actual,
        OnboardingService: class {
            constructor() {
            }

            generateConfigNoteContent = () => '# System Configuration\n@config:active';
        }
    };
});

describe('App component', () => {
    it('should render without crashing', () => {
        // We just want to make sure rendering doesn't throw an error.
        // We don't need to assert anything about the output for a simple smoke test.
        expect(() =>
            render(
                <ToastProvider>
                    <SettingsProvider>
                        <NotesProvider>
                            <ViewProvider>
                                <App/>
                            </ViewProvider>
                        </NotesProvider>
                    </SettingsProvider>
                </ToastProvider>
            )
        ).not.toThrow();
    });
});