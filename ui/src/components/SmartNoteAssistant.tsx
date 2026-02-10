import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSettings} from '../hooks/useSettingsContext';
import {useToast} from '../hooks/useToast';
import {
    Note,
    parseProperties,
    patternRecognitionService,
    PropertyExtractor,
    replacePropertyInString
} from '@notention/core';
import {getTextFromHtml} from '../utils/html';
import {CheckCircleIcon, InformationCircleIcon, LinkIcon, PlusIcon, SparklesIcon} from './common/icons';
import {FeedbackWidget} from './common/FeedbackWidget';
import {agentService} from '../services/AgentService';

interface SmartNoteAssistantProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    className?: string;
}

interface Suggestion {
    id: string;
    text: string;
    type: 'property' | 'link' | 'action';
    confidence?: number;
}

export const SmartNoteAssistant: React.FC<SmartNoteAssistantProps> = ({
                                                                          note,
                                                                          onNoteUpdate,
                                                                          className = ''
                                                                      }) => {
    const {settings} = useSettings();
    const {addToast} = useToast();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    // Track if user explicitly closed the panel to prevent auto-reopening
    const userDismissedRef = useRef(false);

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
        const newSuggestions: Suggestion[] = [];
        const seenTexts = new Set<string>();

        predictions.forEach(p => {
            if (!seenTexts.has(p.predictedAction)) {
                seenTexts.add(p.predictedAction);

                // Determine type
                let type: 'property' | 'action' = 'action';
                if (p.predictedAction.includes('[') && p.predictedAction.includes(']')) {
                    type = 'property';
                }

                newSuggestions.push({
                    id: `pred-${p.pattern.id}-${p.predictedAction}`,
                    text: p.predictedAction,
                    type,
                    confidence: p.confidence
                });
            }
        });

        // Suggest related notes / ontology (Legacy logic maintained)
        if (settings.ontology.length > 0) {
            const relatedNodes = settings.ontology.filter(node =>
                note.content.toLowerCase().includes(node.label.toLowerCase())
            );

            if (relatedNodes.length > 0) {
                const text = `Link to ontology: ${relatedNodes.map(n => n.label).join(', ')}`;
                if (!seenTexts.has(text)) {
                    newSuggestions.push({
                        id: 'ontology-link',
                        text,
                        type: 'link',
                        confidence: 1.0
                    });
                }
            }
        }

        setSuggestions(newSuggestions);

        // Auto-show if high confidence suggestions exist and user hasn't manually hidden
        // We don't check !showSuggestions here to avoid dependency cycle, we just ensure it's visible if allowed
        if (newSuggestions.length > 0 && !userDismissedRef.current) {
            setShowSuggestions(true);
        }
    }, [note, settings.ontology, propertyExtractor]); // Removed showSuggestions to fix dependency loop

    useEffect(() => {
        const timer = setTimeout(() => {
            analyzeNote();
        }, 1000); // Debounce analysis slightly longer
        return () => clearTimeout(timer);
    }, [analyzeNote]);

    const handleApplySuggestion = (suggestion: Suggestion) => {
        let newContent = note.content;
        let applied = false;

        // Parse specific property suggestions: "Add property [key:op:value]"
        const propertyMatch = suggestion.text.match(/\[(.*?):(.*?):(.*?)\]/);

        if (propertyMatch) {
            const tag = propertyMatch[0];
            const newProperty = parseProperties(tag)[0];

            if (newProperty) {
                // Check if property exists to replace it, otherwise append
                // We search for a property with the same key
                const existingProps = parseProperties(note.content);
                const existingProp = existingProps.find(p => p.key === newProperty.key);

                if (existingProp) {
                    newContent = replacePropertyInString(newContent, existingProp, newProperty);
                } else {
                    // Smart Append: try to append after last property block or at end
                    newContent = newContent.trim() + `\n\n${tag}`;
                }
                applied = true;
            }
        } else if (suggestion.text.includes('Create Task') || suggestion.text.includes('Todo List')) {
            if (!note.content.includes('[status:is:pending]')) {
                newContent = newContent.trim() + `\n\n[status:is:pending]`;
                applied = true;
            }
        } else if (suggestion.text.includes('Shopping List')) {
            if (!note.content.includes('[status:is:pending]')) {
                newContent = newContent.trim() + `\n\n[status:is:pending]`;
                applied = true;
            }
        }

        if (applied) {
            onNoteUpdate(newContent);
            addToast('Suggestion applied', 'success');
            // Remove applied suggestion locally to avoid immediate re-suggestion
            setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        } else {
            if (suggestion.type === 'link') {
                addToast('Info: Use [[ to link to ontology', 'info');
            } else {
                addToast('Action not fully implemented yet', 'info');
            }
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'property':
                return <PlusIcon className="w-4 h-4 text-green-400"/>;
            case 'link':
                return <LinkIcon className="w-4 h-4 text-blue-400"/>;
            default:
                return <InformationCircleIcon className="w-4 h-4 text-purple-400"/>;
        }
    };

    const toggleSuggestions = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newState = !showSuggestions;
        setShowSuggestions(newState);
        // If closing, mark as dismissed so it doesn't auto-open on next analysis
        if (!newState) {
            userDismissedRef.current = true;
        } else {
            // If manually opening, clear dismissed state
            userDismissedRef.current = false;
        }
    };

    // Keyboard navigation
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
            setShowSuggestions(false);
            userDismissedRef.current = true;
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
            tabIndex={0} // Make focusable for keyboard events
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
                        <button
                            key={suggestion.id}
                            className={`w-full text-left group flex items-start gap-2.5 p-2 rounded-lg transition-all border border-transparent
                ${index === activeSuggestion ? 'bg-gray-700 border-gray-600' : 'hover:bg-gray-700/50 hover:border-gray-600'}
              `}
                            onClick={() => handleApplySuggestion(suggestion)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                        >
                            <div className="mt-0.5 flex-shrink-0">
                                {getIconForType(suggestion.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200 group-hover:text-white truncate">
                                    {suggestion.text}
                                </p>
                                {suggestion.confidence && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className="h-1 w-12 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500/50"
                                                style={{width: `${suggestion.confidence * 100}%`}}
                                            />
                                        </div>
                                        <span
                                            className="text-[10px] text-gray-500">{Math.round(suggestion.confidence * 100)}% match</span>
                                    </div>
                                )}
                            </div>
                            <div
                                className={`transition-opacity ${index === activeSuggestion ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <CheckCircleIcon className="w-4 h-4 text-gray-400 hover:text-green-400"/>
                            </div>
                        </button>
                    ))}

                    <div className="pt-2 border-t border-gray-700 flex justify-end">
                        <FeedbackWidget
                            entityId={`suggestions-${note.id}`}
                            entityType="suggestion"
                            onFeedback={(type, val) => {
                                // Send feedback to agent
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
