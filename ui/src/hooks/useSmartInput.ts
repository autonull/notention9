import { useState } from 'react';
import { Logger } from '@notention/core';
import { useGardener } from './useGardener';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { useSuggestions } from '../components/contexts/SuggestionContext';

export const useSmartInput = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const { alignToOntology } = useGardener();
    const { settings } = useSettings();
    const { addNote } = useNotes();
    const { setActiveView, setSelectedNoteId } = useView();
    const { addSuggestions } = useSuggestions();

    const processInput = async (text: string) => {
        if (!text.trim()) return;
        setIsProcessing(true);

        try {
            // 1. Create initial note
            const title = text.length < 50
                ? text
                : text.slice(0, 40) + '...';

            const note = addNote({
                title: title,
                content: text
            });

            // 2. Navigate immediately
            setSelectedNoteId(note.id);
            setActiveView('notes');

            // 3. Try to align
            const results = await alignToOntology(text, settings.ontology);

            if (results && results.length > 0) {
                 addSuggestions(note.id, results);
            }
        } catch (e) {
            Logger.getInstance().error("Smart input error", e instanceof Error ? e : new Error(String(e)));
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        processInput,
        isProcessing
    };
};
