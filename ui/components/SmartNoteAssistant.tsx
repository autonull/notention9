import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettings } from '../hooks/useSettingsContext';
import { useToast } from '../hooks/useToast';
import { Note, PropertyExtractor, patternRecognitionService, getTextFromHtml } from '@notention/core';

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

  const propertyExtractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);

  // Analyze the note and provide smart suggestions
  const analyzeNote = useCallback(() => {
    // 1. Extract plain text for analysis
    const plainText = getTextFromHtml(note.content);

    // 2. Extract properties using core logic
    const extractedProperties = propertyExtractor.extractFromText(plainText);

    // 3. Create a temporary note context with extracted properties for prediction
    const analysisNote = {
      ...note,
      properties: [...note.properties, ...extractedProperties]
    };

    // 4. Get predictions from Pattern Recognition Service
    const predictions = patternRecognitionService.predictUserNeeds('current-user', analysisNote);

    // 5. Transform predictions into user-friendly suggestions
    const newSuggestions: string[] = [];

    predictions.forEach(p => {
       // Avoid duplicates
       if (!newSuggestions.includes(p.predictedAction)) {
           newSuggestions.push(p.predictedAction);
       }
    });

    // Suggest related notes / ontology (Legacy logic maintained)
    if (settings.ontology.length > 0) {
      const relatedNodes = settings.ontology.filter(node => 
        note.content.toLowerCase().includes(node.label.toLowerCase())
      );
      
      if (relatedNodes.length > 0) {
        newSuggestions.push(`Consider linking to ontology: ${relatedNodes.map(n => n.label).join(', ')}`);
      }
    }

    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setActiveSuggestion(0);
  }, [note, settings.ontology, propertyExtractor]);

  useEffect(() => {
    const timer = setTimeout(() => {
        analyzeNote();
    }, 500); // Debounce analysis
    return () => clearTimeout(timer);
  }, [analyzeNote]);

  const handleApplySuggestion = (suggestion: string) => {
    let newContent = note.content;
    let applied = false;

    // Parse specific property suggestions: "Add property [key:op:value]"
    const propertyMatch = suggestion.match(/\[(.*?):(.*?):(.*?)\]/);

    if (propertyMatch) {
        const tag = propertyMatch[0];
        newContent = newContent.trim() + `\n\n${tag}`;
        applied = true;
    } else if (suggestion.includes('Create Task') || suggestion.includes('Todo List')) {
        // Fallback or generic actions
        if (!note.content.includes('[status:is:pending]')) {
             newContent = newContent.trim() + `\n\n[status:is:pending]`;
             applied = true;
        }
    } else if (suggestion.includes('Shopping List')) {
        if (!note.content.includes('[status:is:pending]')) {
             newContent = newContent.trim() + `\n\n[status:is:pending]`;
             applied = true;
        }
    }

    if (applied) {
        onNoteUpdate({ ...note, content: newContent });
        addToast('Suggestion applied', 'success');
        setShowSuggestions(false);
    } else {
        // Handle informational suggestions
        if (suggestion.includes('Consider linking')) {
            addToast('Info: Use [[ to link to ontology', 'info');
        } else {
            addToast('Action not fully implemented yet', 'info');
        }
    }
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
        <h4 className="font-medium text-blue-400">Suggestions</h4>
        <button 
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-gray-400 hover:text-white"
        >
          {showSuggestions ? 'Hide' : 'Show'}
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
          None
        </div>
      )}
      
      {!showSuggestions && (
        <div className="text-sm text-gray-500">
          {suggestions.length} available
        </div>
      )}
    </div>
  );
};