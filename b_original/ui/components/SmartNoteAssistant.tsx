import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettingsContext';
import { useToast } from '../hooks/useToast';
import { Note } from '@notention/core';
import { parseProperties } from '@notention/core';
import { matchNotesWithRealVsImaginary } from '../utils/matching';

interface SmartNoteAssistantProps {
  note: Note;
  onNoteUpdate: (updatedNote: Note) => void;
  className?: string;
}

export const SmartNoteAssistant: React.FC<SmartNoteAssistantProps> = ({
  note,
  onNoteUpdate,
  className = ''
}) => {
  const { settings } = useSettings();
  const { addToast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

  // Analyze the note and provide smart suggestions
  const analyzeNote = useCallback(() => {
    const parsedProps = parseProperties(note.content);
    const suggestions: string[] = [];

    // Suggest semantic properties based on content
    if (note.content.toLowerCase().includes('need') || note.content.toLowerCase().includes('want')) {
      suggestions.push('Consider adding [status:is:pending] for tracking');
      suggestions.push('Add [priority:is:high] if urgent');
    }

    if (note.content.toLowerCase().includes('by') || note.content.toLowerCase().includes('until')) {
      suggestions.push('Consider adding a [deadline:is:date] property');
    }

    if (note.content.toLowerCase().includes('$') || note.content.match(/\d+\s*(dollars?|usd)/i)) {
      suggestions.push('Consider adding [budget:is:amount] property');
    }

    // Suggest related notes
    if (settings.ontology.length > 0) {
      const relatedNodes = settings.ontology.filter(node =>
        note.content.toLowerCase().includes(node.label.toLowerCase())
      );

      if (relatedNodes.length > 0) {
        suggestions.push(`Consider linking to ontology: ${relatedNodes.map(n => n.label).join(', ')}`);
      }
    }

    setSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setActiveSuggestion(0);
  }, [note, settings.ontology]);

  useEffect(() => {
    analyzeNote();
  }, [analyzeNote]);

  const handleApplySuggestion = (suggestion: string) => {
    // This is a simplified implementation - in a real app, this would be more sophisticated
    if (suggestion.includes('status:is:pending')) {
      const newContent = note.content + `\n\n[status:is:pending]`;
      onNoteUpdate({ ...note, content: newContent });
    } else if (suggestion.includes('priority:is:high')) {
      const newContent = note.content + `\n\n[priority:is:high]`;
      onNoteUpdate({ ...note, content: newContent });
    } else if (suggestion.includes('deadline:is:date')) {
      const newContent = note.content + `\n\n[deadline:is:YYYY-MM-DD]`;
      onNoteUpdate({ ...note, content: newContent });
    } else if (suggestion.includes('budget:is:amount')) {
      const newContent = note.content + `\n\n[budget:is:000]`;
      onNoteUpdate({ ...note, content: newContent });
    }

    addToast('Suggestion applied to note', 'success');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[activeSuggestion]) {
        handleApplySuggestion(suggestions[activeSuggestion]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${className}`} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-blue-400 flex items-center">
          <span className="mr-2">💡</span> Smart Assistant
        </h4>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-gray-400 hover:text-white"
        >
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-2 rounded cursor-pointer transition-colors ${
                index === activeSuggestion
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => handleApplySuggestion(suggestion)}
            >
              <div className="flex items-start">
                <span className="mr-2 text-sm">•</span>
                <span className="text-sm">{suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No suggestions available for this note
        </div>
      )}

      {!showSuggestions && (
        <div className="text-sm text-gray-500">
          {suggestions.length} suggestion{ suggestions.length !== 1 ? 's' : '' } available
        </div>
      )}
    </div>
  );
};