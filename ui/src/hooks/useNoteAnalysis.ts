import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Note, patternRecognitionService, PropertyExtractor, OntologyNode, getCanonicalKey } from '@notention/core';
import { useSettings } from './useSettingsContext';
import { getTextFromHtml } from '../utils/html';

export interface Suggestion {
    id: string;
    text: string;
    type: 'property' | 'link' | 'action';
    confidence?: number;
}

const generateOntologySuggestions = (content: string, ontology: OntologyNode[], seenTexts: Set<string>): Suggestion[] => {
    const contentLower = content.toLowerCase();
    const relatedNodes = ontology.filter(node => contentLower.includes(node.label.toLowerCase()));

    if (relatedNodes.length === 0) return [];

    const text = `Link to ontology: ${relatedNodes.map(n => n.label).join(', ')}`;
    if (seenTexts.has(text)) return [];

    return [{
        id: 'ontology-link',
        text,
        type: 'link',
        confidence: 1.0
    }];
};

export function useNoteAnalysis(note: Note) {
    const { settings } = useSettings();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const userDismissedRef = useRef(false);

    const propertyExtractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);

    const analyzeNote = useCallback(() => {
        if (!settings.ontology || settings.ontology.length === 0) return; // Skip if no ontology
        const plainText = getTextFromHtml(note.content);
        const extractedProperties = propertyExtractor.extractFromText(plainText);

        const analysisNote = {
            ...note,
            properties: [...note.properties, ...extractedProperties]
        };

        const predictions = patternRecognitionService.predictUserNeeds('current-user', analysisNote, settings.ontology);
        const seenTexts = new Set<string>();

        const predictionSuggestions = predictions.reduce<Suggestion[]>((acc, p) => {
            let predictedText = p.predictedAction;
            let displayText = predictedText;

            // Normalize property keys in predictions if it looks like a property
            const propMatch = predictedText.match(/^\[(.*?)\]$/);
            if (propMatch) {
                const parts = propMatch[1].split(':');
                if (parts.length >= 2) {
                    const key = parts[0];
                    const canonicalKey = getCanonicalKey(key, settings.ontology);
                    if (canonicalKey !== key) {
                        parts[0] = canonicalKey;
                        const canonicalText = `[${parts.join(':')}]`;
                        displayText = `${canonicalText} (from alias '${key}')`;
                        predictedText = canonicalText;
                    }
                }
            }

            if (seenTexts.has(predictedText)) return acc;

            seenTexts.add(predictedText);
            const isProperty = predictedText.includes('[') && predictedText.includes(']');

            acc.push({
                id: `pred-${p.pattern.id}-${predictedText}`,
                text: displayText, // Show user context
                type: isProperty ? 'property' : 'action',
                confidence: p.confidence
            });
            return acc;
        }, []);

        const ontologySuggestions = settings.ontology.length > 0
            ? generateOntologySuggestions(note.content, settings.ontology, seenTexts)
            : [];

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
