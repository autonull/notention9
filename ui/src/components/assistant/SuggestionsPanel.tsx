import { Note } from '@notention/core';
import { NoteSuggestions } from '../suggestions/NoteSuggestions';

interface SuggestionsPanelProps {
    note: Note | null;
}

export function SuggestionsPanel({ note }: SuggestionsPanelProps) {
    return <NoteSuggestions note={note} />;
}