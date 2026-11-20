import {useCallback, useRef, useState} from 'react';
import {Property, OntologyNode} from '@notention/core';
import {inferenceRouter} from '../services/ai/inference';
import {useAIDegradedMode} from './useAIDegradedMode';

interface AIAlignState {
    data: Property[] | null;
    loading: boolean;
    error: Error | null;
    fallbackUsed: boolean;
    providerUsed: string;
    providerKind: string;
}

interface UseAIAlignOptions {
    onFallback?: (provider: string, kind: string) => void;
    onError?: (error: Error) => void;
    onSuccess?: (properties: Property[]) => void;
}

export function useAIAlign(options: UseAIAlignOptions = {}) {
    const [state, setState] = useState<AIAlignState>({
        data: null,
        loading: false,
        error: null,
        fallbackUsed: false,
        providerUsed: 'none',
        providerKind: 'none',
    });

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const align = useCallback(async (text: string, ontology: OntologyNode[]) => {
        setState(prev => ({...prev, loading: true, error: null}));
        try {
            const result = await inferenceRouter.alignToOntology(text, ontology, {
                timeout: 30000,
                maxRetries: 2,
                autoRepair: true,
            });

            setState(prev => ({
                ...prev,
                data: result.data,
                loading: false,
                fallbackUsed: result.fallbackUsed,
                providerUsed: result.providerUsed,
                providerKind: result.providerKind,
                error: result.error,
            }));

            if (result.fallbackUsed && optionsRef.current.onFallback) {
                optionsRef.current.onFallback(result.providerUsed, result.providerKind);
            }
            if (result.error && optionsRef.current.onError) {
                optionsRef.current.onError(result.error);
            }
            if (result.data && optionsRef.current.onSuccess) {
                optionsRef.current.onSuccess(result.data);
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            setState(prev => ({
                ...prev,
                loading: false,
                error,
                fallbackUsed: false,
            }));
            if (optionsRef.current.onError) {
                optionsRef.current.onError(error);
            }
        }
    }, []);

    // Integrate with degraded mode tracking
    useAIDegradedMode({
        ...state,
        enabled: true,
    });

    return {
        ...state,
        align,
    };
}