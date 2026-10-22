import { Suggestion } from '@notention/core';
import { SuggestionItem } from '../SuggestionItem';
import { FeedbackWidget } from '../common/FeedbackWidget';
import { agentService } from '../../services/AgentService';
import { useToast } from '../../hooks/useToast';

interface SuggestionsPanelProps {
    suggestions: Suggestion[];
    activeSuggestion: number;
    onApplySuggestion: (suggestion: Suggestion) => void;
    onMouseEnter: (index: number) => void;
    noteId: string;
}

export function SuggestionsPanel({
    suggestions,
    activeSuggestion,
    onApplySuggestion,
    onMouseEnter,
    noteId
}: SuggestionsPanelProps) {
    const { addToast } = useToast();

    if (suggestions.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-gray-500 italic">
                No suggestions available.
            </div>
        );
    }

    return (
        <>
            {suggestions.map((suggestion, index) => (
                <SuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    isActive={index === activeSuggestion}
                    onApply={() => onApplySuggestion(suggestion)}
                    onMouseEnter={() => onMouseEnter(index)}
                />
            ))}
            <div className="pt-2 border-t border-gray-800 flex justify-end">
                <FeedbackWidget
                    entityId={`suggestions-${noteId}`}
                    entityType="suggestion"
                    onFeedback={(type, val) => {
                        agentService.send(JSON.stringify({
                            type: 'feedback',
                            payload: {
                                id: crypto.randomUUID(),
                                entityId: `suggestions-${noteId}`,
                                entityType: 'suggestion',
                                value: type === 'positive' ? 1 : -1,
                                context: { details: val },
                                timestamp: Date.now()
                            }
                        }));
                        addToast('Feedback sent', 'success');
                    }}
                />
            </div>
        </>
    );
}