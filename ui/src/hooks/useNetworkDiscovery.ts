import { useState, useCallback } from 'react';
import { Note, ScoredMatch, OntologyNode } from '@notention/core';
import { nostrService } from '../services/NostrService';
import { useToast } from './useToast';

interface UseNetworkDiscoveryResult {
    matches: ScoredMatch[];
    isSearching: boolean;
    error: string | null;
    discover: () => Promise<void>;
    clear: () => void;
}

export function useNetworkDiscovery(note: Note, ontology: OntologyNode[]): UseNetworkDiscoveryResult {
    const [matches, setMatches] = useState<ScoredMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const discover = useCallback(async () => {
        setIsSearching(true);
        setError(null);
        try {
            const results = await nostrService.findMatches(note, ontology);
            setMatches(results);
            if (results.length === 0) {
                addToast('No matches found in the network', 'info');
            } else {
                addToast(`Found ${results.length} matches!`, 'success');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setError(msg);
            addToast('Failed to search network', 'error');
        } finally {
            setIsSearching(false);
        }
    }, [note, ontology, addToast]);

    const clear = useCallback(() => {
        setMatches([]);
        setError(null);
    }, []);

    return {
        matches,
        isSearching,
        error,
        discover,
        clear
    };
}
