import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import App from '../src/App';
import {NotesProvider} from '../src/components/contexts/NotesContext';
import {SettingsProvider} from '../src/components/contexts/SettingsContext';
import {ToastProvider} from '../src/components/contexts/ToastProvider';
import {ViewProvider} from '../src/components/contexts/ViewContext';

// Mock the hooks
vi.mock('../src/hooks/useNotes', () => ({
    useNotes: () => ({
        notes: [],
        addNote: vi.fn(),
        deleteNote: vi.fn(),
        notesLoading: false,
        getSortedFilteredNotes: vi.fn(() => []),
    }),
}));

vi.mock('../src/hooks/useViewContext', () => ({
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
    }),
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
