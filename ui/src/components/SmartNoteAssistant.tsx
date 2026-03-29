import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Note, parseProperties, replacePropertyInString } from '@notention/core';
import { SparklesIcon } from './common/icons';
import { FeedbackWidget } from './common/FeedbackWidget';
import { agentService } from '../services/AgentService';
import { useNoteAnalysis, Suggestion } from '../hooks/useNoteAnalysis';
import { SuggestionItem } from './SuggestionItem';

interface SmartNoteAssistantProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    className?: string;
}

export const SmartNoteAssistant: React.FC<SmartNoteAssistantProps> = ({
    note,
    onNoteUpdate,
    className = ''
}) => {
    const { addToast } = useToast();
    const { suggestions, showSuggestions, dismissSuggestions, openSuggestions, removeSuggestion } = useNoteAnalysis(note);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    const handleApplySuggestion = (suggestion: Suggestion) => {
        let newContent = note.content;
        let applied = false;

        const propertyMatch = suggestion.text.match(/\[(.*?):(.*?):(.*?)\]/);

        if (propertyMatch) {
            const tag = propertyMatch[0];
            const newProperty = parseProperties(tag)[0];

            if (newProperty) {
                const existingProps = parseProperties(note.content);
                const existingProp = existingProps.find(p => p.key === newProperty.key);

                if (existingProp) {
                    newContent = replacePropertyInString(newContent, existingProp, newProperty);
                } else {
                    newContent = newContent.trim() + `\n\n${tag}`;
                }
                applied = true;
            }
        } else if (['Create Task', 'Todo List', 'Shopping List'].some(s => suggestion.text.includes(s))) {
             if (!note.content.includes('[status:is:pending]')) {
                newContent = newContent.trim() + `\n\n[status:is:pending]`;
                applied = true;
            }
        }

        if (applied) {
            onNoteUpdate(newContent);
            addToast('Suggestion applied', 'success');
            removeSuggestion(suggestion.id);
        } else {
            if (suggestion.type === 'link') {
                addToast('Info: Use [[ to link to ontology', 'info');
            } else {
                addToast('Action not fully implemented yet', 'info');
            }
        }
    };

    const toggleSuggestions = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (showSuggestions) {
            dismissSuggestions();
        } else {
            openSuggestions();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

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
            dismissSuggestions();
        }
    };

    if (suggestions.length === 0) {
        return (
            <div className={`flex items-center gap-2 p-2 rounded-lg border border-transparent ${className}`}>
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-600">
                    <SparklesIcon className="w-4 h-4"/>
                </div>
                <span className="text-xs text-gray-600 italic">No suggestions</span>
            </div>
        );
    }

    return (
        <div
            className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-sm ${className}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div
                className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={toggleSuggestions}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-yellow-400 animate-pulse"/>
                    <span className="text-sm font-semibold text-gray-200">
                        {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <button
                    onClick={toggleSuggestions}
                    className="text-xs text-gray-500 hover:text-white"
                >
                    {showSuggestions ? 'Hide' : 'Show'}
                </button>
            </div>

            {showSuggestions && (
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions.map((suggestion, index) => (
                        <SuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            isActive={index === activeSuggestion}
                            onApply={() => handleApplySuggestion(suggestion)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                        />
                    ))}

                    <div className="pt-2 border-t border-gray-700 flex justify-end">
                        <FeedbackWidget
                            entityId={`suggestions-${note.id}`}
                            entityType="suggestion"
                            onFeedback={(type, val) => {
                                agentService.send({
                                    type: 'feedback',
                                    payload: {
                                        id: crypto.randomUUID(),
                                        entityId: `suggestions-${note.id}`,
                                        entityType: 'suggestion',
                                        value: type === 'positive' ? 1 : -1,
                                        context: {details: val},
                                        timestamp: Date.now()
                                    }
                                });
                                addToast('Feedback sent', 'success');
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
