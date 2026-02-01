import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SmartNoteAssistant } from '../../components/SmartNoteAssistant';
import { SettingsProvider } from '../../components/contexts/SettingsContext';
import { ToastProvider } from '../../components/contexts/ToastProvider';
import { Note } from '@notention/core';

// Mock contexts
const MockProviders = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </SettingsProvider>
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
      stats: { viewCount: 0, readTime: 0 }
    };

    render(
      <MockProviders>
        <SmartNoteAssistant note={note} onNoteUpdate={() => {}} />
      </MockProviders>
    );

    expect(screen.getByText('Suggestions')).toBeInTheDocument();
    // In the previous failure, "available" was not found because suggestions WERE found (due to mock content).
    // When suggestions are found, it renders suggestions list, not the count.
    // Let's check for suggestions themselves or the count if hidden.
    // By default, showSuggestions is false (from source code inspection in Refactor step).

    // Actually, analyzeNote runs on mount. If suggestions > 0, setShowSuggestions(true).
    // So suggestions are shown.

    expect(screen.getByText(/Hide/)).toBeInTheDocument(); // Button should say Hide

    // Verify removed texts are gone
    expect(screen.queryByText('Smart Assistant')).not.toBeInTheDocument();
    expect(screen.queryByText('Show Suggestions')).not.toBeInTheDocument();
  });
});
