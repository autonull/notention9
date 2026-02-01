import { useCallback } from 'react';
import type { OntologyNode } from '@notention/core';
import { useGardener } from './useGardener';
import { useAutoTagging } from './useAutoTagging';
import { useToast } from './useToast';
import { useSuggestions } from '../components/contexts/SuggestionContext';
import { parseProperties, replacePropertyInString, getTextFromHtml } from '@notention/core';
import { parseNaturalDate } from '@notention/core';

interface UseEditorMagicProps {
    noteId: string;
    content: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    onContentSave: (content: string) => void;
    ontology: OntologyNode[];
}

export function useEditorMagic({ noteId, content, tags, onTagsChange, onContentSave, ontology }: UseEditorMagicProps) {
    const { alignToOntology } = useGardener();
    const { addToast } = useToast();
    const { addSuggestions } = useSuggestions();

    const { isAutoTagging, handleAutoTag, isApiKeyAvailable } = useAutoTagging({
        content,
        tags,
        onTagsChange
    });

    const handleMagic = useCallback(async () => {
        const cleanText = getTextFromHtml(content);
        const suggestions = await alignToOntology(cleanText, ontology);

        // Also look for natural language date conversions in existing properties
        const existingProps = parseProperties(content);
        let newContent = content;
        let convertedCount = 0;

        existingProps.forEach(prop => {
            if (['date', 'deadline', 'start', 'end'].some(k => prop.key.includes(k))) {
               const val = prop.values[0];
               if (!val) return;

               const parsed = parseNaturalDate(val);
               if (parsed && parsed !== val) {
                   const newProp = { ...prop, values: [parsed] };
                   newContent = replacePropertyInString(newContent, prop, newProp);
                   convertedCount++;
               }
            }
        });

        if (convertedCount > 0) {
            onContentSave(newContent);
            addToast(`Magic: Converted ${convertedCount} dates.`, 'success');
        }

        if (suggestions.length > 0) {
            // Instead of modifying content directly, queue suggestions
            addSuggestions(noteId, suggestions);
            addToast(`Magic: ${suggestions.length} suggestions found. Review them below.`, 'info');
        } else if (convertedCount === 0) {
            addToast('Magic: No new properties or dates found.', 'info');
        }

        // Always trigger auto-tagging
        handleAutoTag();

    }, [content, alignToOntology, ontology, onContentSave, addToast, handleAutoTag, noteId, addSuggestions]);

    return {
        handleMagic,
        handleAutoTag,
        isAutoTagging,
        isApiKeyAvailable
    };
}
