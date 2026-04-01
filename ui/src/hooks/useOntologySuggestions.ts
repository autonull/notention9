import {useMemo, useEffect, useState} from 'react';
import {OntologyService, SuggestedAttribute} from '@notention/core';
import {useSettings} from './useSettingsContext';
import {useNotes} from './useNotes';

export function useOntologySuggestions(contextKeys?: string[]) {
    const {settings} = useSettings();
    const ontology = settings.ontology;
    const {notes} = useNotes();
    const [suggestions, setSuggestions] = useState<SuggestedAttribute[]>([]);

    // Instantiate OntologyService to generate learning stats
    // We recreate it when ontology or notes change to re-scan
    const ontologyService = useMemo(() => new OntologyService(ontology), [ontology]);

    useEffect(() => {
        // Feed notes to service to learn
        ontologyService.recordUsage(notes.flatMap(n => n.properties.map(p => ({
            key: p.key,
            values: p.values
        }))));

        if (contextKeys && contextKeys.length > 0) {
            // Contextual suggestions (no frequency threshold, relevance based)
            setSuggestions(ontologyService.getContextualSuggestions(contextKeys));
        } else {
            // Global suggestions
            const threshold = settings.developerMode ? 1 : 3;
            setSuggestions(ontologyService.getSuggestedAttributes(threshold));
        }
    }, [notes, ontologyService, settings.developerMode, contextKeys]);

    return {
        suggestions,
        ontologyService
    };
}
