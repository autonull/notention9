import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditorMatches } from '../../../components/editor/EditorMatches';

// Mock dependencies
vi.mock('../../../hooks/useSingleNoteMatch', () => ({
  useSingleNoteMatch: () => ({
    matches: [
      {
        event: {
          id: 'evt1',
          pubkey: 'pub1',
          content: '<b>Matching Content</b>',
          created_at: 1672531200,
          tags: []
        },
        score: 0.9,
        satisfied: [{ key: 'role', operator: 'is', values: ['Dev'] }],
        failed: []
      }
    ]
  })
}));

vi.mock('../../../hooks/useNotes', () => ({
  useNotes: () => ({
    addNote: vi.fn()
  })
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}));

vi.mock('../../../hooks/useGardener', () => ({
  useGardener: () => ({
    learnFromProperties: vi.fn()
  })
}));

vi.mock('../../../hooks/useViewContext', () => ({
  useView: () => ({
    setActiveView: vi.fn(),
    setSelectedChatPubkey: vi.fn()
  })
}));

// Mock FeedbackWidget
vi.mock('../../../components/common/FeedbackWidget', () => ({
  FeedbackWidget: ({ onFeedback }: any) => (
    <button data-testid="feedback-btn" onClick={() => onFeedback({ value: 1 })}>
      Rate Match
    </button>
  )
}));

describe('EditorMatches', () => {
  const mockNote: any = { id: 'note1', title: 'My Note' };

  it('renders matches safely', () => {
    render(<EditorMatches note={mockNote} />);
    expect(screen.getByText(/Matching Content/)).toBeInTheDocument();
  });

  it('renders feedback widget', () => {
    render(<EditorMatches note={mockNote} />);
    expect(screen.getByTestId('feedback-btn')).toBeInTheDocument();
  });

  it('shows satisfied properties', () => {
    render(<EditorMatches note={mockNote} />);
    // Use regex to be flexible about whitespace/breaking
    expect(screen.getByText(/Dev/)).toBeInTheDocument();
  });
});
