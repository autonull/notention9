import {useCallback, useEffect, useState} from 'react';

const STORAGE_KEY = 'notention:rejected-matches';

function getRejectedMatches(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

function saveRejectedMatches(matches: Set<string>): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(matches)));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Hook for tracking rejected match IDs
 * Persists to localStorage so rejections survive page reloads
 */
export function useRejectedMatches() {
    const [rejectedMatches, setRejectedMatches] = useState<Set<string>>(new Set());

    // Load from localStorage on mount
    useEffect(() => {
        setRejectedMatches(getRejectedMatches());
    }, []);

    const isRejected = useCallback((matchId: string): boolean => {
        return rejectedMatches.has(matchId);
    }, [rejectedMatches]);

    const rejectMatch = useCallback((matchId: string) => {
        setRejectedMatches(prev => {
            const next = new Set(prev);
            next.add(matchId);
            saveRejectedMatches(next);
            return next;
        });
    }, []);

    const unRejectMatch = useCallback((matchId: string) => {
        setRejectedMatches(prev => {
            const next = new Set(prev);
            next.delete(matchId);
            saveRejectedMatches(next);
            return next;
        });
    }, []);

    const clearAllRejections = useCallback(() => {
        setRejectedMatches(new Set());
        saveRejectedMatches(new Set());
    }, []);

    return {
        rejectedMatches,
        isRejected,
        rejectMatch,
        unRejectMatch,
        clearAllRejections
    };
}