import {useCallback, useEffect, useMemo, useRef} from 'react';
import {Note} from '@notention/core';

// Debounced save function to prevent excessive writes
export const useOptimizedNoteEditing = (
    saveCallback: (note: Note) => void,
    delay: number = 1000
) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingSaveRef = useRef<{ note: Note } | null>(null);

    const scheduleSave = useCallback((note: Note) => {
        // Update the pending save
        pendingSaveRef.current = {note};

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Schedule the save
        timeoutRef.current = setTimeout(() => {
            if (pendingSaveRef.current) {
                saveCallback(pendingSaveRef.current.note);
                pendingSaveRef.current = null;
            }
        }, delay);
    }, [saveCallback, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return scheduleSave;
};

// Performance-optimized property extraction
export function useOptimizedPropertyExtraction(content: string) {
    const extractedProperties = useMemo(() => {
        // Use a more efficient regex that avoids catastrophic backtracking
        const propertyRegex = /\[([^\]:]+):([^\]:]+):([^\]]+)\]|(\[[^\]]+\])/g;
        const matches = [];

        for (const match of content.matchAll(propertyRegex)) {
            if (match[1]) { // Canonical form [key:op:value]
                matches.push({
                    key: match[1],
                    operator: match[2],
                    value: match[3],
                    fullMatch: match[0]
                });
            } else { // Natural form [expression]
                matches.push({
                    expression: match[4],
                    fullMatch: match[4]
                });
            }
        }

        return matches;
    }, [content]);

    return extractedProperties;
};