import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { NotesProvider } from '../components/contexts/NotesContext';
import { SettingsProvider } from '../components/contexts/SettingsContext';
import { ToastProvider } from '../components/contexts/ToastProvider';
import { ViewProvider } from '../components/contexts/ViewContext';

// Mock the hooks
vi.mock('../hooks/useNotes', () => ({
  useNotes: () => ({
    notes: [],
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    notesLoading: false,
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
  }),
}));

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
                <App />
              </ViewProvider>
            </NotesProvider>
          </SettingsProvider>
        </ToastProvider>
      )
    ).not.toThrow();
  });
});
