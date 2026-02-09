import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Note, patternRecognitionService, PropertyExtractor } from '@notention/core';
import { useSettings } from './useSettingsContext';
import { getTextFromHtml } from '../utils/html';

export interface Suggestion {
    id: string;
    text: string;
    type: 'property' | 'link' | 'action';
    confidence?: number;
}

export function useNoteAnalysis(note: Note) {
    const { settings } = useSettings();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const userDismissedRef = useRef(false);

    const propertyExtractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);

    const analyzeNote = useCallback(() => {
        const plainText = getTextFromHtml(note.content);
        const extractedProperties = propertyExtractor.extractFromText(plainText);

        const analysisNote = {
            ...note,
            properties: [...note.properties, ...extractedProperties]
        };

        const predictions = patternRecognitionService.predictUserNeeds('current-user', analysisNote);

        const seenTexts = new Set<string>();

        const predictionSuggestions = predictions.reduce<Suggestion[]>((acc, p) => {
            if (!seenTexts.has(p.predictedAction)) {
                seenTexts.add(p.predictedAction);
                const type = (p.predictedAction.includes('[') && p.predictedAction.includes(']')) ? 'property' : 'action';
                acc.push({
                    id: `pred-${p.pattern.id}-${p.predictedAction}`,
                    text: p.predictedAction,
                    type,
                    confidence: p.confidence
                });
            }
            return acc;
        }, []);

        const ontologySuggestions: Suggestion[] = [];
        if (settings.ontology.length > 0) {
            const relatedNodes = settings.ontology.filter(node =>
                note.content.toLowerCase().includes(node.label.toLowerCase())
            );

            if (relatedNodes.length > 0) {
                const text = `Link to ontology: ${relatedNodes.map(n => n.label).join(', ')}`;
                if (!seenTexts.has(text)) {
                    ontologySuggestions.push({
                        id: 'ontology-link',
                        text,
                        type: 'link',
                        confidence: 1.0
                    });
                }
            }
        }

        const newSuggestions = [...predictionSuggestions, ...ontologySuggestions];
        setSuggestions(newSuggestions);

        if (newSuggestions.length > 0 && !userDismissedRef.current) {
            setShowSuggestions(true);
        }
    }, [note, settings.ontology, propertyExtractor]);

    useEffect(() => {
        const timer = setTimeout(analyzeNote, 1000);
        return () => clearTimeout(timer);
    }, [analyzeNote]);

    const dismissSuggestions = useCallback(() => {
        setShowSuggestions(false);
        userDismissedRef.current = true;
    }, []);

    const openSuggestions = useCallback(() => {
        setShowSuggestions(true);
        userDismissedRef.current = false;
    }, []);

    const removeSuggestion = useCallback((id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    }, []);

    return {
        suggestions,
        showSuggestions,
        dismissSuggestions,
        openSuggestions,
        removeSuggestion
    };
}
