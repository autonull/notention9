import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorManager } from '../../components/editor/EditorManager';
import { ViewContext } from '../../components/contexts/ViewContext';
import { SettingsContext } from '../../components/contexts/SettingsContext';
import type { Note } from '@notention/core';

// Mock SuggestionContext
vi.mock('../../components/contexts/SuggestionContext', () => ({
  useSuggestions: () => ({
    suggestions: {},
    addSuggestions: vi.fn(),
    clearSuggestions: vi.fn(),
    removeSuggestion: vi.fn(),
    loading: false
  }),
}));

// Mock TiptapEditor
vi.mock('../../components/editor/TiptapEditor', () => {
  const MockEditor = React.forwardRef((_props, _ref) => <div data-testid="mock-editor">Editor</div>);
  MockEditor.displayName = 'TiptapEditor';
  return { TiptapEditor: MockEditor };
});

// Mock usePublish
const mockPublishNote = vi.fn();
vi.mock('../../hooks/usePublish', () => ({
  usePublish: () => ({
    publishNote: mockPublishNote,
    isPublishing: false,
  }),
}));

// Mock useAutoTagging
const mockHandleAutoTag = vi.fn();
vi.mock('../../hooks/useAutoTagging', () => ({
  useAutoTagging: ({ onTagsChange }: { onTagsChange: (tags: string[]) => void }) => ({
    isAutoTagging: false,
    handleAutoTag: () => {
        mockHandleAutoTag();
        // Simulate tag change
        onTagsChange(['tag1', 'tag2']);
    },
    isApiKeyAvailable: true,
  }),
}));

// Mock useNotes
vi.mock('../../hooks/useNotes', () => ({
  useNotes: () => ({
    notes: [],
  }),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('../../hooks/useToast', () => ({
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
    vi.spyOn(window, 'alert').mockImplementation(() => {});
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
            nostr: { privkey: null },
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
    renderWithContext(<EditorManager note={initialNote} onSave={mockOnSave} />);
    const titleInput = screen.getByPlaceholderText('Untitled Note') as HTMLInputElement;
    expect(titleInput.value).toBe('Original Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
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

    renderWithContext(<EditorManager note={initialNote} onSave={mockOnSave} />);

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
     renderWithContext(<EditorManager note={{...initialNote, content: '<p>Some content</p>', tags: ['test']}} onSave={mockOnSave} />);
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
