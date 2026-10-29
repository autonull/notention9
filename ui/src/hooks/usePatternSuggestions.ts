import {useCallback, useEffect, useMemo, useState} from 'react';
import {Note, patternRecognitionService, Property} from '@notention/core';
import {useSettings} from './useSettingsContext';
import type {SuggestedAttribute} from '@notention/core';

const PROPERTY_ACTION_PREFIX = 'Add property [';
const PROPERTY_ACTION_SUFFIX = ']';

function parsePropertyAction(action: string): {key: string; operator: string; value: string} | null {
    if (!action.startsWith(PROPERTY_ACTION_PREFIX) || !action.endsWith(PROPERTY_ACTION_SUFFIX)) {
        return null;
    }
    const content = action.slice(PROPERTY_ACTION_PREFIX.length, -PROPERTY_ACTION_SUFFIX.length);
    const parts = content.split(':');
    if (parts.length < 3) return null;
    return {
        key: parts[0],
        operator: parts[1],
        value: parts.slice(2).join(':')
    };
}

export function usePatternSuggestions(note: Note) {
    const {settings} = useSettings();
    const [suggestions, setSuggestions] = useState<SuggestedAttribute[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyze = useCallback(async () => {
        if (!settings.ontology || settings.ontology.length === 0) return;
        setIsAnalyzing(true);
        try {
            const predictions = patternRecognitionService.predictUserNeeds('current-user', note, settings.ontology);
            const propertySuggestions: SuggestedAttribute[] = [];

            for (const prediction of predictions) {
                const parsed = parsePropertyAction(prediction.predictedAction);
                if (parsed) {
                    const existing = note.properties.some(p => p.key === parsed.key && p.operator === parsed.operator && p.values.includes(parsed.value));
                    if (!existing) {
                        propertySuggestions.push({
                            key: parsed.key,
                            type: parsed.operator,
                            frequency: 1,
                            confidence: prediction.confidence,
                            parentContext: prediction.pattern.name
                        });
                    }
                }
            }

            setSuggestions(propertySuggestions.slice(0, 5));
        } finally {
            setIsAnalyzing(false);
        }
    }, [note, settings.ontology]);

    useEffect(() => {
        const timer = setTimeout(analyze, 500);
        return () => clearTimeout(timer);
    }, [analyze]);

    return useMemo(() => ({suggestions, isAnalyzing}), [suggestions, isAnalyzing]);
}