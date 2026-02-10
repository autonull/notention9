import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EditorManager} from '../../src/components/editor/EditorManager';
import {ViewContext} from '../../src/components/contexts/ViewContext';
import {SettingsContext} from '../../src/components/contexts/SettingsContext';
import type {Note} from '@notention/core';

// Mock @notention/core metaphorMapper
vi.mock('@notention/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@notention/core')>();
    return {
        ...actual,
        metaphorMapper: {
            mapToMetaphor: vi.fn().mockReturnValue(null),
        },
    };
});

// Mock SuggestionContext
vi.mock('../../src/components/contexts/SuggestionContext', () => ({
    useSuggestions: () => ({
        suggestions: {},
        addSuggestions: vi.fn(),
        clearSuggestions: vi.fn(),
        removeSuggestion: vi.fn(),
        loading: false
    }),
}));

// Mock TiptapEditor
vi.mock('../../src/components/editor/TiptapEditor', () => {
    const MockEditor = React.forwardRef((_props, _ref) => <div data-testid="mock-editor">Editor</div>);
    MockEditor.displayName = 'TiptapEditor';
    return {TiptapEditor: MockEditor};
});

// Mock usePublish
const mockPublishNote = vi.fn();
vi.mock('../../src/hooks/usePublish', () => ({
    usePublish: () => ({
        publishNote: mockPublishNote,
        isPublishing: false,
    }),
}));

// Mock useAutoTagging
const mockHandleAutoTag = vi.fn();
vi.mock('../../src/hooks/useAutoTagging', () => ({
    useAutoTagging: ({onTagsChange}: { onTagsChange: (tags: string[]) => void }) => ({
        isAutoTagging: false,
        handleAutoTag: async () => {
            mockHandleAutoTag();
            // Simulate tag change
            onTagsChange(['tag1', 'tag2']);
        },
        isApiKeyAvailable: true,
    }),
}));

// Mock useNotes
vi.mock('../../src/hooks/useNotes', () => ({
    useNotes: () => ({
        notes: [],
        getSortedFilteredNotes: vi.fn(() => []),
    }),
}));

// Mock useGardener
vi.mock('../../src/hooks/useGardener', () => ({
    useGardener: () => ({
        evolveOntology: vi.fn().mockResolvedValue([]),
        alignToOntology: vi.fn().mockResolvedValue([]),
        learnFromProperties: vi.fn(),
        optimizeOntology: vi.fn().mockResolvedValue({merged: [], pruned: []}),
    }),
}));

// Mock useSettings
vi.mock('../../src/hooks/useSettingsContext', () => ({
    useSettings: () => ({
        settings: {
            aiEnabled: false,
            developerMode: true,
            theme: 'dark' as const,
            nostr: {privkey: null},
            ontology: [],
            customTemplates: [],
            aiProvider: 'remote',
            aiModel: 'gemini-pro',
            googleGeminiApiKey: '',
        },
        setSettings: vi.fn(),
        settingsLoading: false,
    }),
}));

// Mock useEditorActions
vi.mock('../../src/hooks/useEditorActions', () => ({
    useEditorActions: () => ({
        handleExport: vi.fn(),
        handleCopyContent: vi.fn(),
    }),
}));

// Mock useEditorShortcuts
vi.mock('../../src/hooks/useEditorShortcuts', () => ({
    useEditorShortcuts: vi.fn(),
}));

// Mock useEditorModals
vi.mock('../../src/hooks/useEditorModals', () => ({
    useEditorModals: () => ({
        isInspectorOpen: false,
        setIsInspectorOpen: vi.fn(),
        isTemplateSelectorOpen: false,
        setIsTemplateSelectorOpen: vi.fn(),
        isSaveTemplateModalOpen: false,
        setIsSaveTemplateModalOpen: vi.fn(),
        isMapPickerOpen: false,
        setIsMapPickerOpen: vi.fn(),
        isTimePickerOpen: false,
        setIsTimePickerOpen: vi.fn(),
        pickingTimeKey: null,
        handlePickTime: vi.fn(),
        handleTimeSelected: vi.fn(),
        handleLocationSelect: vi.fn(),
        handleRequestLocationPick: vi.fn(),
    }),
}));

// Mock useOntologyMatching
vi.mock('../../src/hooks/useOntologyMatching', () => ({
    useOntologyMatching: () => ({
        matchingOntologyNode: null,
        actionLabel: 'Save',
        validationErrors: [],
        missingProperties: [],
    }),
}));

// Mock useEditorPublishing
vi.mock('../../src/hooks/useEditorPublishing', () => ({
    useEditorPublishing: () => ({
        handlePublish: vi.fn(),
        isPublishing: false,
        privacyConfirmation: null,
        handlePrivacyConfirm: vi.fn(),
        handlePrivacyCancel: vi.fn(),
    }),
}));

// Mock useEditorTemplates
vi.mock('../../src/hooks/useEditorTemplates', () => ({
    useEditorTemplates: () => ({
        handleSaveTemplate: vi.fn(),
    }),
}));

// Mock useDebouncedSave
vi.mock('../../src/hooks/useDebouncedSave', () => ({
    useDebouncedSave: () => ({
        dirtyNote: {
            id: '123',
            title: 'Original Title',
            content: '<p>Content</p>',
            tags: [],
            properties: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        setDirtyNote: vi.fn(),
        saveStatus: 'saved' as const,
    }),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('../../src/hooks/useToast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

describe('EditorManager', () => {
    const mockOnSave = vi.fn();
    const initialNote: Note = {
        id: '123',
        title: 'Original Title',
        content: '<p>Content</p>',
        tags: [],
        properties: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        mockOnSave.mockClear();
        mockPublishNote.mockClear();
        mockHandleAutoTag.mockClear();
        mockAddToast.mockClear();
        // Mock window.confirm and alert
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        vi.spyOn(window, 'alert').mockImplementation(() => {
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const renderWithContext = (ui: React.ReactElement) => {
        const mockSettingsContext = {
            settings: {
                aiEnabled: false,
                developerMode: true,
                theme: 'dark' as const,
                nostr: {privkey: null},
                ontology: [],
                customTemplates: []
            },
            setSettings: vi.fn(),
            settingsLoading: false
        };

        return render(
            <SettingsContext.Provider value={mockSettingsContext}>
                <ViewContext.Provider value={{
                    activeView: 'notes',
                    setActiveView: vi.fn(),
                    selectedNoteId: null,
                    setSelectedNoteId: vi.fn(),
                    matchingNoteId: null,
                    setMatchingNoteId: vi.fn(),
                    showToast: vi.fn(),
                    notificationCount: 0,
                    matches: [],
                    addMatch: vi.fn(),
                    clearNotifications: vi.fn(),
                    selectedChatPubkey: null,
                    setSelectedChatPubkey: vi.fn()
                }}>
                    {ui}
                </ViewContext.Provider>
            </SettingsContext.Provider>
        );
    };

    it('updates title and saves after debounce when user types', () => {
        renderWithContext(<EditorManager note={initialNote} onSave={mockOnSave}/>);
        const titleInput = screen.getByPlaceholderText('Untitled Note') as HTMLInputElement;
        expect(titleInput.value).toBe('Original Title');
        fireEvent.change(titleInput, {target: {value: 'New Title'}});
        expect(titleInput.value).toBe('New Title');
        expect(mockOnSave).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(mockOnSave).toHaveBeenCalledTimes(1);
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
            title: 'New Title',
        }));
    });

    it('calls publishNote when publish button is clicked', async () => {
        mockPublishNote.mockResolvedValue('event-id-123');

        renderWithContext(<EditorManager note={initialNote} onSave={mockOnSave}/>);

        const publishBtn = screen.getByTitle('Publish');

        await act(async () => {
            fireEvent.click(publishBtn);
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(mockPublishNote).toHaveBeenCalledWith(expect.objectContaining({
            id: '123'
        }));

        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
            nostrEventId: 'event-id-123'
        }));
    });

    it('calls handleAutoTag when auto-tag button is clicked', async () => {
        renderWithContext(<EditorManager note={{...initialNote, content: '<p>Some content</p>', tags: ['test']}}
                                         onSave={mockOnSave}/>);
        const autoTagBtn = screen.getByTitle('Auto-suggest tags with AI');

        await act(async () => {
            fireEvent.click(autoTagBtn);
        });

        expect(mockHandleAutoTag).toHaveBeenCalled();
        // Since our mock immediately calls onTagsChange
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
    });
});
